import { useCallback, useEffect, useState } from 'react';
import { UserPlus, Pencil, Trash2, UserCheck, UserX, Copy, Eye, EyeOff, Wand2, ShieldCheck, Check, X, Users } from 'lucide-react';
import {
  Button, IconButton, Input, Modal, ConfirmDialog, Card, CardHeader, Badge, EmptyState, ErrorState, Skeleton, Toggle, cx,
} from './ui.jsx';
import { managerApi } from '../api/endpoints.js';
import { errMsg } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

const CAN = ['Mark items sold out or available', 'Turn items on or off for this branch', 'See this branch’s menu only'];
const CANNOT = ['Edit names, prices, photos or categories', 'See other branches or brand settings', 'Create or manage other accounts'];

function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function PasswordField({ value, onChange, label, hint, required, autoComplete = 'new-password' }) {
  const [show, setShow] = useState(false);
  return (
    <Input
      label={label}
      type={show ? 'text' : 'password'}
      required={required}
      minLength={8}
      autoComplete={autoComplete}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      hint={hint}
      className="pe-20 font-mono"
      trailing={
        <>
          <IconButton size="sm" label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((s) => !s)}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </IconButton>
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
        </>
      }
    />
  );
}

function initials(name, email) {
  const src = (name || email || '?').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

export default function BranchManagers({ branch }) {
  const toast = useToast();
  const [managers, setManagers] = useState(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // null | { mode: 'create' } | { mode: 'edit', manager } | { mode: 'created', creds }
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind: 'remove' | 'deactivate', manager }

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await managerApi.list(branch._id);
      setManagers(data.managers);
    } catch (err) {
      setError(errMsg(err, 'Could not load branch managers'));
    }
  }, [branch._id]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm({ name: '', email: '', phone: '', password: generatePassword(), isActive: true });
    setModal({ mode: 'create' });
  };
  const openEdit = (manager) => {
    setForm({ name: manager.name || '', email: manager.email, phone: manager.phone || '', password: '', isActive: manager.isActive });
    setModal({ mode: 'edit', manager });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        const { data } = await managerApi.create(branch._id, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
        });
        setManagers((prev) => [...(prev || []), data.manager]);
        setModal({ mode: 'created', creds: { email: data.manager.email, password: form.password, name: data.manager.name } });
        toast.success('Branch manager created');
      } else {
        const payload = { name: form.name, email: form.email, phone: form.phone, isActive: form.isActive };
        if (form.password) payload.password = form.password;
        const { data } = await managerApi.update(modal.manager.id, payload);
        setManagers((prev) => prev.map((m) => (m.id === data.manager.id ? data.manager : m)));
        setModal(null);
        toast.success('Branch manager updated');
      }
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (manager, isActive) => {
    setBusyId(manager.id);
    try {
      const { data } = await managerApi.update(manager.id, { isActive });
      setManagers((prev) => prev.map((m) => (m.id === data.manager.id ? data.manager : m)));
      toast.success(isActive ? `${manager.name} can sign in again` : `${manager.name} has been signed out and deactivated`);
      setConfirm(null);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (manager) => {
    setBusyId(manager.id);
    try {
      await managerApi.remove(manager.id);
      setManagers((prev) => prev.filter((m) => m.id !== manager.id));
      toast.success('Branch manager removed');
      setConfirm(null);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusyId(null);
    }
  };

  const loginUrl = `${window.location.origin}/login`;
  const copyCreds = (creds) => {
    navigator.clipboard.writeText(`DINEZA sign-in for ${branch.nameEn}\n${loginUrl}\nEmail: ${creds.email}\nPassword: ${creds.password}`);
    toast.success('Sign-in details copied');
  };

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <Card>
        <CardHeader
          title="Branch managers"
          description={`People who run ${branch.nameEn} day to day. They sign in with their own email and see only this branch.`}
          action={
            <Button size="sm" onClick={openCreate}>
              <UserPlus size={15} aria-hidden="true" /> Add manager
            </Button>
          }
        />
        {error ? (
          <div className="p-5"><ErrorState message={error} onRetry={load} /></div>
        ) : !managers ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : managers.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Users}
              title="No branch manager yet"
              subtitle="Add one so this branch can mark items sold out without access to your master menu."
              action={<Button onClick={openCreate}><UserPlus size={15} aria-hidden="true" /> Add manager</Button>}
            />
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {managers.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div
                  className={cx(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                    m.isActive ? 'bg-brand-50 text-brand-800' : 'bg-gray-100 text-gray-500'
                  )}
                  aria-hidden="true"
                >
                  {initials(m.name, m.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-gray-900">{m.name}</span>
                    <Badge color={m.isActive ? 'green' : 'gray'} dot>{m.isActive ? 'Active' : 'Deactivated'}</Badge>
                  </div>
                  <div className="truncate text-[13px] text-gray-500">
                    {m.email}
                    {m.phone ? ` · ${m.phone}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {m.isActive ? (
                    <IconButton label={`Deactivate ${m.name}`} disabled={busyId === m.id} onClick={() => setConfirm({ kind: 'deactivate', manager: m })}>
                      <UserX size={16} />
                    </IconButton>
                  ) : (
                    <IconButton label={`Reactivate ${m.name}`} disabled={busyId === m.id} onClick={() => setActive(m, true)}>
                      <UserCheck size={16} />
                    </IconButton>
                  )}
                  <IconButton label={`Edit ${m.name}`} onClick={() => openEdit(m)}>
                    <Pencil size={16} />
                  </IconButton>
                  <IconButton label={`Remove ${m.name}`} variant="danger" disabled={busyId === m.id} onClick={() => setConfirm({ kind: 'remove', manager: m })}>
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* What the role can and cannot do */}
      <Card className="h-fit p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <ShieldCheck size={16} className="text-brand-700" aria-hidden="true" /> Branch manager access
        </div>
        <ul className="space-y-2">
          {CAN.map((t) => (
            <li key={t} className="flex gap-2 text-[13px] text-gray-700">
              <Check size={15} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" /> {t}
            </li>
          ))}
        </ul>
        <ul className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          {CANNOT.map((t) => (
            <li key={t} className="flex gap-2 text-[13px] text-gray-500">
              <X size={15} className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" /> {t}
            </li>
          ))}
        </ul>
      </Card>

      {/* Create / edit */}
      <Modal
        open={modal?.mode === 'create' || modal?.mode === 'edit'}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? 'Edit branch manager' : `New manager for ${branch.nameEn}`}
        description={modal?.mode === 'edit' ? 'Changing the email or password signs them out everywhere.' : 'They will only see and manage this branch.'}
      >
        <form onSubmit={submit} className="space-y-4">
          <Input label="Full name" required autoComplete="off" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sara Al Balushi" />
          <Input label="Email" type="email" required autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="manager@restaurant.com" />
          <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Optional" />
          <PasswordField
            label={modal?.mode === 'edit' ? 'New password' : 'Password'}
            required={modal?.mode !== 'edit'}
            hint={modal?.mode === 'edit' ? 'Leave empty to keep the current password. Minimum 8 characters.' : 'Minimum 8 characters. Share it with the manager privately.'}
            value={form.password}
            onChange={(password) => setForm({ ...form, password })}
          />
          {modal?.mode === 'edit' && (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-gray-900">Account active</div>
                <div className="text-xs text-gray-500">Deactivated managers cannot sign in.</div>
              </div>
              <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} tone="success" label="Account active" />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" loading={saving}>{modal?.mode === 'edit' ? 'Save changes' : 'Create manager'}</Button>
          </div>
        </form>
      </Modal>

      {/* One-time credentials hand-off */}
      <Modal open={modal?.mode === 'created'} onClose={() => setModal(null)} title="Manager created" description="Share these sign-in details privately. The password is not shown again.">
        {modal?.mode === 'created' && (
          <div className="space-y-4">
            <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200 text-sm">
              {[
                ['Sign-in page', loginUrl],
                ['Email', modal.creds.email],
                ['Password', modal.creds.password],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="min-w-0 truncate font-mono text-[13px] text-gray-900">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => copyCreds(modal.creds)}>
                <Copy size={15} aria-hidden="true" /> Copy details
              </Button>
              <Button onClick={() => setModal(null)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirm?.kind === 'deactivate'}
        onClose={() => setConfirm(null)}
        onConfirm={() => setActive(confirm.manager, false)}
        loading={busyId === confirm?.manager?.id}
        title="Deactivate this manager?"
        confirmLabel="Deactivate"
        message={`${confirm?.manager?.name} will be signed out immediately and cannot sign in until you reactivate the account.`}
      />
      <ConfirmDialog
        open={confirm?.kind === 'remove'}
        onClose={() => setConfirm(null)}
        onConfirm={() => remove(confirm.manager)}
        loading={busyId === confirm?.manager?.id}
        title="Remove this manager?"
        confirmLabel="Remove"
        message={`${confirm?.manager?.name}'s account will be deleted permanently. You can add a new manager at any time.`}
      />
    </div>
  );
}
