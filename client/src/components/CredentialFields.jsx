import { useState } from 'react';
import { Check, Circle, Eye, EyeOff, Wand2 } from 'lucide-react';
import { Input, IconButton, cx } from './ui.jsx';
import { usernameChecks, usernameReserved, passwordChecks, generatePassword } from '../lib/credentials.js';

// Live checklist under a username or password field: each rule turns green once met
export function RuleList({ checks }) {
  return (
    <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
      {checks.map((c) => (
        <li key={c.label} title={c.hint} className={cx('flex items-start gap-1.5 text-xs', c.ok ? 'text-brand-700' : 'text-gray-500')}>
          {c.ok ? (
            <Check size={14} className="mt-px shrink-0" aria-hidden="true" />
          ) : (
            <Circle size={12} className="mt-0.5 shrink-0 text-gray-300" aria-hidden="true" />
          )}
          <span>
            {c.label}
            <span className="sr-only">{c.ok ? ' (done)' : ' (not yet)'}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

// Username: kept lowercase without spaces while typing, with the rules listed underneath
export function UsernameField({ value, onChange, label = 'Username', rules = true, ...props }) {
  return (
    <div>
      <Input
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value.toLowerCase().replace(/\s/g, ''))}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={30}
        className="font-mono"
        error={value && usernameReserved(value) ? 'This username is reserved. Choose another one' : undefined}
        {...props}
      />
      {rules && <RuleList checks={usernameChecks(value)} />}
    </div>
  );
}

// Password with show/hide, an optional generator, and the rules listed underneath
export function PasswordField({
  value, onChange, label = 'Password', username = '', rules = true, canGenerate = false, autoComplete = 'new-password', ...props
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <Input
        label={label}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cx('font-mono', canGenerate ? 'pe-20' : 'pe-11')}
        trailing={
          <>
            <IconButton size="sm" label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((s) => !s)}>
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </IconButton>
            {canGenerate && (
              <IconButton
                size="sm"
                label="Generate a strong password"
                onClick={() => {
                  onChange(generatePassword());
                  setShow(true);
                }}
              >
                <Wand2 size={15} />
              </IconButton>
            )}
          </>
        }
        {...props}
      />
      {rules && <RuleList checks={passwordChecks(value, username)} />}
    </div>
  );
}
