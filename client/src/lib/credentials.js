// Username + password rules, shown live while typing. The server enforces the same
// rules in server/src/utils/credentials.js; keep both in step.

export const USERNAME_MIN = 8;
export const USERNAME_MAX = 30;
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 72;

const RESERVED = ['admin', 'root', 'support', 'dineza', 'system', 'superuser'];

// Usernames are case-insensitive; the field keeps them lowercase as people type
export const normalizeUsername = (value) => String(value ?? '').trim().toLowerCase();

export function usernameChecks(raw) {
  const u = normalizeUsername(raw);
  return [
    { label: `${USERNAME_MIN} to ${USERNAME_MAX} characters`, ok: u.length >= USERNAME_MIN && u.length <= USERNAME_MAX },
    { label: 'Starts with a letter', ok: /^[a-z]/.test(u) },
    { label: 'Includes a number', ok: /[0-9]/.test(u) },
    {
      label: 'Only letters, numbers, dot (.) or underscore (_)',
      ok: u.length > 0 && /^[a-z0-9._]+$/.test(u) && !/[._]{2}/.test(u) && !/[._]$/.test(u),
      hint: 'No spaces, no two symbols together, no symbol at the end',
    },
  ];
}

export function usernameReserved(raw) {
  const u = normalizeUsername(raw);
  return RESERVED.some((w) => u.startsWith(w));
}

export function passwordChecks(password, username = '') {
  const p = String(password ?? '');
  const u = normalizeUsername(username);
  return [
    { label: `At least ${PASSWORD_MIN} characters`, ok: p.length >= PASSWORD_MIN && new TextEncoder().encode(p).length <= PASSWORD_MAX },
    { label: 'A capital letter (A-Z)', ok: /[A-Z]/.test(p) },
    { label: 'A small letter (a-z)', ok: /[a-z]/.test(p) },
    { label: 'A number (0-9)', ok: /[0-9]/.test(p) },
    { label: 'A symbol, like ! @ # $ %', ok: /[^A-Za-z0-9\s]/.test(p) },
    { label: 'No spaces, and not the username', ok: p.length > 0 && !/\s/.test(p) && !(u && p.toLowerCase().includes(u)) },
  ];
}

export const allOk = (checks) => checks.every((c) => c.ok);

// A random password that always meets the rules (used for new branch managers)
export function generatePassword(length = 14) {
  const sets = ['ABCDEFGHJKMNPQRSTUVWXYZ', 'abcdefghjkmnpqrstuvwxyz', '23456789', '!@#$%&*?'];
  const all = sets.join('');
  const pick = (chars) => {
    const b = new Uint32Array(1);
    crypto.getRandomValues(b);
    return chars[b[0] % chars.length];
  };
  const out = sets.map(pick);
  while (out.length < length) out.push(pick(all));
  // Shuffle so the guaranteed characters are not always at the start
  for (let i = out.length - 1; i > 0; i--) {
    const b = new Uint32Array(1);
    crypto.getRandomValues(b);
    const j = b[0] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join('');
}
