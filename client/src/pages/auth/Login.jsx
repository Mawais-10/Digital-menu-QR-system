import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
// import { Link } from 'react-router-dom';            // RESTORE: needed by the full AuthShell version below
// import AuthShell from './AuthShell.jsx';            // RESTORE: full split-screen login
import { Button, Input, IconButton, LogoFull } from '../../components/ui.jsx';
import { useAuth, homePath, isBranchManager } from '../../context/AuthContext.jsx';
import { errMsg } from '../../api/client.js';

// Send each role to a page it is allowed to see
function landingFor(user, from) {
  if (!from || user.mustChangePassword) return homePath(user);
  const branchArea = from.startsWith('/branch');
  return isBranchManager(user) === branchArea ? from : homePath(user);
}

// Minimal login — just username + password centered on screen. Brand managers and
// branch managers use the same form; the account's role decides where they land.
// The full split-screen version (with brand panel + signup link) is preserved
// in the comment block at the bottom of this file; swap back when needed.
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.username, form.password);
      navigate(landingFor(user, location.state?.from?.pathname), { replace: true });
    } catch (err) {
      setError(errMsg(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dash flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <LogoFull className="h-28 w-auto" />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card sm:p-7">
          <h1 className="text-lg font-semibold text-gray-900">Sign in</h1>
          <p className="mt-1 text-sm text-gray-500">For brand and branch managers.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Input
              label="Username"
              required
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="your.username1"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
            />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="pe-11"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              trailing={
                <IconButton size="sm" label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </IconButton>
              }
            />
            {error && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" loading={loading} className="w-full" size="lg">Sign in</Button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   RESTORE: full split-screen login (AuthShell + signup link).
   To bring it back: delete the minimal component above, rename
   FullLogin -> Login, and re-enable the two imports at the top.
   ============================================================

function FullLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.username, form.password);
      navigate(location.state?.from?.pathname || (user.restaurantId ? '/dashboard' : '/onboarding'), { replace: true });
    } catch (err) {
      setError(errMsg(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your menus"
      footer={
        <>
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-brand-600 hover:text-brand-700">Create one free</Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Username"
          required
          autoComplete="username"
          autoCapitalize="none"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
        />
        <Input
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">{error}</p>}
        <Button type="submit" loading={loading} className="w-full" size="lg">Sign in</Button>
      </form>
    </AuthShell>
  );
}
============================================================ */
