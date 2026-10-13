import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Store, MapPin, Phone, Copy, ExternalLink, ChevronRight, Lock } from 'lucide-react';
import { Button, IconButton, Input, Modal, Card, EmptyState, ErrorState, PageHeader, PageSkeleton, Badge } from '../../components/ui.jsx';
import LocationField from '../../components/LocationField.jsx';
import { branchApi } from '../../api/endpoints.js';
import { errMsg } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';

const EMPTY_FORM = { nameEn: '', nameAr: '', address: '', phone: '', lat: null, lng: null, mapUrl: '' };

export default function Branches() {
  const toast = useToast();
  const [branches, setBranches] = useState(null);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await branchApi.list();
      setBranches(data.branches);
    } catch (err) {
      setError(errMsg(err, 'Could not load branches'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await branchApi.create(form);
      toast.success('Branch created and its QR code is ready');
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = (b) => {
    navigator.clipboard.writeText(b.menuUrl);
    toast.success('Menu link copied');
  };

  if (error) return <ErrorState title="Branches could not be loaded" message={error} onRetry={load} />;
  if (!branches) return <PageSkeleton rows={3} />;

  return (
    <div>
      <PageHeader
        title="Branches"
        subtitle="Each branch has a permanent menu link, its own QR code, availability and managers."
        action={<Button onClick={() => setCreateOpen(true)}><Plus size={16} aria-hidden="true" /> New branch</Button>}
      />

      {branches.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No branches yet"
          subtitle="Create a branch to generate its permanent QR code."
          action={<Button onClick={() => setCreateOpen(true)}><Plus size={16} aria-hidden="true" /> Add branch</Button>}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {branches.map((b) => (
            <li key={b._id}>
              <Card className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="flex flex-wrap items-baseline gap-x-2 text-[15px] font-semibold text-gray-900">
                      <span className="truncate">{b.nameEn}</span>
                      {b.nameAr && <span className="font-arabic truncate text-sm font-medium text-gray-500">{b.nameAr}</span>}
                    </h2>
                    <div className="mt-1 flex items-center gap-1.5 font-mono text-xs text-gray-500">
                      <Lock size={11} aria-hidden="true" /> /menu/{b.slug}
                    </div>
                  </div>
                  <Badge color={b.status === 'active' ? 'green' : 'gray'} dot>{b.status === 'active' ? 'Active' : 'Inactive'}</Badge>
                </div>

                {(b.address || b.phone) && (
                  <div className="mt-4 space-y-1.5 text-[13px] text-gray-600">
                    {b.address && (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="shrink-0 text-gray-400" aria-hidden="true" />
                        <span className="truncate">{b.address}</span>
                      </div>
                    )}
                    {b.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="shrink-0 text-gray-400" aria-hidden="true" />
                        <span>{b.phone}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex-1" aria-hidden="true" />
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-3.5">
                  <div className="flex gap-0.5">
                    <IconButton label={`Copy ${b.nameEn} menu link`} onClick={() => copyUrl(b)}>
                      <Copy size={16} />
                    </IconButton>
                    <a
                      href={`/menu/${b.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open ${b.nameEn} live menu`}
                      title="Open live menu"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                    >
                      <ExternalLink size={16} aria-hidden="true" />
                    </a>
                  </div>
                  <Link
                    to={`/dashboard/branches/${b._id}`}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 text-[13px] font-semibold text-gray-800 shadow-card transition-colors hover:bg-gray-50"
                  >
                    Manage <ChevronRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New branch" description="Its menu link and QR code are created automatically." size="md">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Branch name (English)" required placeholder="e.g. Al Khuwair" value={form.nameEn} onChange={set('nameEn')} />
            <Input label="Branch name (Arabic)" dir="rtl" placeholder="مثال: الخوير" value={form.nameAr} onChange={set('nameAr')} />
          </div>
          <Input label="Address" placeholder="Street, area, city" value={form.address} onChange={set('address')} />
          <Input label="Contact number" type="tel" placeholder="+968 9xxx xxxx" value={form.phone} onChange={set('phone')} />
          <LocationField value={form} onChange={setForm} />
          <div className="flex items-start gap-2.5 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-3">
            <Lock size={14} className="mt-0.5 shrink-0 text-gray-500" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-gray-600">
              The menu link is made from the branch name and is <strong className="font-semibold text-gray-900">permanent</strong>, so printed QR codes keep working forever.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create branch</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
