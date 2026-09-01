import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// import { Link } from 'react-router-dom';            // RESTORE: needed by the full AuthShell version below
// import AuthShell from './AuthShell.jsx';            // RESTORE: full split-screen login
import { Button, Input, LogoMark } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { errMsg } from '../../api/client.js';

// Minimal login — just email + password centered on screen.
// The full split-screen version (with brand panel + signup link) is preserved
// in the comment block at the bottom of this file; swap back when needed.
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(location.state?.from?.pathname || (user.restaurantId ? '/dashboard' : '/onboarding'), { replace: true });
    } catch (err) {
      setError(errMsg(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-5">
      <div className="w-full max-w-xs">
        <div className="mb-8 flex flex-col items-center gap-3">
          <LogoMark size={44} />
          <span className="text-xl font-extrabold tracking-tight text-gray-900">Simat</span>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@restaurant.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
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
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
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
          label="Email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@restaurant.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
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
