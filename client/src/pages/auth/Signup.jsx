import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from './AuthShell.jsx';
import { Button, Input } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { errMsg } from '../../api/client.js';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ businessName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(form);
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setError(errMsg(err, 'Signup failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Get your digital menu live in minutes"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">Sign in</Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Input label="Business name" required placeholder="e.g. Shawarma House" value={form.businessName} onChange={set('businessName')} />
        <Input label="Email" type="email" required autoComplete="email" placeholder="you@restaurant.com" value={form.email} onChange={set('email')} />
        <Input label="Phone" type="tel" placeholder="+968 9xxx xxxx" value={form.phone} onChange={set('phone')} />
        <Input
          label="Password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Minimum 8 characters"
          value={form.password}
          onChange={set('password')}
        />
        {error && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">{error}</p>}
        <Button type="submit" loading={loading} className="w-full" size="lg">Create account</Button>
      </form>
    </AuthShell>
  );
}
