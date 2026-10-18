import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button, LogoFull } from '../../components/ui.jsx';
import { PasswordField } from '../../components/CredentialFields.jsx';
import { useAuth, homePath } from '../../context/AuthContext.jsx';
import { authApi } from '../../api/endpoints.js';
import { errMsg } from '../../api/client.js';
import { passwordChecks, allOk } from '../../lib/credentials.js';

// Shown right after sign-in when the account's password predates the current rules.
// Nothing else in the app opens until a strong password is set.
export default function ChangePassword() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const strong = allOk(passwordChecks(pw.newPassword, user?.username));
  const matches = pw.confirm.length > 0 && pw.confirm === pw.newPassword;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!strong) return setError('The new password does not meet all the rules yet.');
    if (!matches) return setError('The two new passwords do not match.');
    setSaving(true);
    try {
      const { data } = await authApi.changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setUser(data.user);
      navigate(homePath(data.user), { replace: true });
    } catch (err) {
      setError(errMsg(err, 'Could not change the password'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dash flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <LogoFull className="h-24 w-auto" />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card sm:p-7">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700" aria-hidden="true">
              <ShieldCheck size={18} />
            </span>
            <h1 className="text-lg font-semibold text-gray-900">Set a stronger password</h1>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Signed in as <span className="font-mono font-medium text-gray-800">{user?.username}</span>. Your current password is
            too easy to guess, so choose a new one before you continue.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <PasswordField
              label="Current password"
              required
              rules={false}
              autoComplete="current-password"
              value={pw.currentPassword}
              onChange={(v) => setPw({ ...pw, currentPassword: v })}
            />
            <PasswordField
              label="New password"
              required
              username={user?.username}
              value={pw.newPassword}
              onChange={(v) => setPw({ ...pw, newPassword: v })}
            />
            <PasswordField
              label="Repeat new password"
              required
              rules={false}
              value={pw.confirm}
              onChange={(v) => setPw({ ...pw, confirm: v })}
              error={pw.confirm && !matches ? 'Does not match the new password' : undefined}
            />
            {error && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" loading={saving} className="w-full" size="lg">Save new password</Button>
            <button type="button" onClick={logout} className="w-full cursor-pointer text-center text-sm font-medium text-gray-500 hover:text-gray-800">
              Sign out instead
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
