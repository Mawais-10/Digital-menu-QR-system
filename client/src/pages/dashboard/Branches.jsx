import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Store, MapPin, Phone, Copy, ExternalLink, ChevronRight, Lock } from 'lucide-react';
import { Button, Input, Modal, Card, Spinner, EmptyState, PageHeader, Badge } from '../../components/ui.jsx';
import LocationField from '../../components/LocationField.jsx';
import { branchApi } from '../../api/endpoints.js';
import { errMsg } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function Branches() {
  const toast = useToast();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ nameEn: '', nameAr: '', address: '', phone: '', lat: null, lng: null, mapUrl: '' });
  const [saving, setSaving] = useState(false);

  const load = () => branchApi.list().then(({ data }) => setBranches(data.branches));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await branchApi.create(form);
      toast.success('Branch created — QR code ready');
      setCreateOpen(false);
      setForm({ nameEn: '', nameAr: '', address: '', phone: '', lat: null, lng: null, mapUrl: '' });
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

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Branches"
        subtitle="Each branch has a permanent menu link and QR code"
        action={<Button onClick={() => setCreateOpen(true)}><Plus size={16} /> New branch</Button>}
      />

      {branches.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No branches yet"
          subtitle="Create a branch to generate its permanent QR code."
          action={<Button onClick={() => setCreateOpen(true)}><Plus size={16} /> Add branch</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {branches.map((b) => (
            <Card key={b._id} className="p-5 transition-shadow hover:shadow-lift">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-base font-bold text-gray-900">{b.nameEn}</h3>
                    {b.nameAr && <span className="font-arabic truncate text-sm text-gray-500">{b.nameAr}</span>}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 font-mono text-xs text-gray-400">
                    <Lock size={11} /> /menu/{b.slug}
                  </div>
                </div>
                <Badge color={b.status === 'active' ? 'green' : 'gray'}>{b.status}</Badge>
              </div>

              <div className="mt-3.5 space-y-1.5 text-sm text-gray-500">
                {b.address && <div className="flex items-center gap-2"><MapPin size={14} className="shrink-0 text-gray-300" />{b.address}</div>}
                {b.phone && <div className="flex items-center gap-2"><Phone size={14} className="shrink-0 text-gray-300" />{b.phone}</div>}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-3.5">
                <div className="flex gap-1">
                  <button onClick={() => copyUrl(b)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Copy menu link">
                    <Copy size={15} />
                  </button>
                  <a href={`/menu/${b.slug}`} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Open live menu">
                    <ExternalLink size={15} />
                  </a>
                </div>
                <Link to={`/dashboard/branches/${b._id}`}>
                  <Button variant="secondary" size="sm">Manage <ChevronRight size={14} /></Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New branch">
        <form onSubmit={submit} className="space-y-4">
          <Input label="Branch name (English)" required placeholder="e.g. Al Khuwair" value={form.nameEn} onChange={set('nameEn')} />
          <Input label="Branch name (Arabic)" dir="rtl" placeholder="مثال: الخوير" value={form.nameAr} onChange={set('nameAr')} />
          <Input label="Address" placeholder="Street, area, city" value={form.address} onChange={set('address')} />
          <Input label="Contact number" type="tel" placeholder="+968 9xxx xxxx" value={form.phone} onChange={set('phone')} />
          <LocationField value={form} onChange={setForm} />
          <div className="flex items-start gap-2.5 rounded-xl bg-gray-50 px-3.5 py-2.5 ring-1 ring-gray-100">
            <Lock size={14} className="mt-0.5 shrink-0 text-gray-400" />
            <p className="text-xs leading-relaxed text-gray-500">
              Your menu link is created from the branch name and is{' '}
              <strong className="font-semibold text-gray-700">permanent</strong> — printed QR codes keep working forever.
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
