import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Download, Copy, Lock, Trash2, Info, ListChecks, QrCode as QrIcon, Users } from 'lucide-react';
import {
  Button, IconButton, Input, Card, CardHeader, Toggle, ConfirmDialog, Badge, PageHeader, PageSkeleton, ErrorState,
  ExternalLinkButton, Tabs, tabIds, Skeleton,
} from '../../components/ui.jsx';
import LocationField from '../../components/LocationField.jsx';
import AvailabilityList, { AvailabilitySummary } from '../../components/AvailabilityList.jsx';
import BranchManagers from '../../components/BranchManagers.jsx';
import { useBranchAvailability } from '../../hooks/useBranchAvailability.js';
import { branchApi } from '../../api/endpoints.js';
import { errMsg } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const TABS = [
  { id: 'availability', label: 'Menu availability', icon: ListChecks },
  { id: 'managers', label: 'Managers', icon: Users },
  { id: 'qr', label: 'QR code', icon: QrIcon },
  { id: 'info', label: 'Branch info', icon: Info },
];

export default function BranchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { restaurant } = useAuth();
  const currency = restaurant?.currency || 'OMR';
  const decimals = currency === 'OMR' ? 3 : 2;

  const [branch, setBranch] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState('availability');
  const [qr, setQr] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadBranch = useCallback(async () => {
    setLoadError('');
    try {
      const { data } = await branchApi.get(id);
      const b = data.branch;
      setBranch(b);
      setForm({
        nameEn: b.nameEn,
        nameAr: b.nameAr || '',
        address: b.address || '',
        phone: b.phone || '',
        status: b.status,
        lat: b.lat ?? null,
        lng: b.lng ?? null,
        mapUrl: b.mapUrl || '',
      });
    } catch (err) {
      if (err?.response?.status === 404) navigate('/dashboard/branches', { replace: true });
      else setLoadError(errMsg(err, 'Could not load this branch'));
    }
  }, [id, navigate]);

  useEffect(() => {
    loadBranch();
    branchApi.qrPreview(id).then(({ data }) => setQr(data)).catch(() => setQr(false));
  }, [id, loadBranch]);

  const load = useCallback(async () => (await branchApi.items(id)).data.items, [id]);
  const save = useCallback(async (itemId, patch) => (await branchApi.updateItem(id, itemId, patch)).data, [id]);
  const availability = useBranchAvailability({ load, save, toast });

  const savePrice = async (row, raw) => {
    const trimmed = String(raw).trim();
    const customPrice = trimmed === '' ? null : Number(trimmed);
    if (customPrice !== null && (Number.isNaN(customPrice) || customPrice < 0)) {
      toast.error('Enter a valid price, or leave it empty to use the base price');
      return;
    }
    try {
      const { data } = await branchApi.updateItem(id, row.item._id, { customPrice });
      availability.patchRow(row.item._id, data);
      toast.success(customPrice === null ? 'Back to the base price' : 'Branch price saved');
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const saveInfo = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await branchApi.update(id, form);
      setBranch(data.branch);
      toast.success('Branch updated');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await branchApi.remove(id);
      toast.success('Branch deleted');
      navigate('/dashboard/branches');
    } catch (err) {
      toast.error(errMsg(err));
      setDeleting(false);
    }
  };

  const copy = (text, msg) => {
    navigator.clipboard.writeText(text);
    toast.success(msg);
  };

  if (loadError) return <ErrorState title="This branch could not be loaded" message={loadError} onRetry={loadBranch} />;
  if (!branch || !form) return <PageSkeleton rows={5} />;

  const panel = (t) => ({ role: 'tabpanel', id: tabIds('branch', t).panel, 'aria-labelledby': tabIds('branch', t).tab, tabIndex: 0, className: 'rounded-lg' });

  return (
    <div>
      <PageHeader
        back={{ to: '/dashboard/branches', label: 'All branches' }}
        title={branch.nameEn}
        meta={<Badge color={branch.status === 'active' ? 'green' : 'gray'} dot>{branch.status === 'active' ? 'Active' : 'Inactive'}</Badge>}
        subtitle={
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-gray-500">
            <Lock size={12} aria-hidden="true" /> {branch.menuUrl}
          </span>
        }
        action={<ExternalLinkButton href={`/menu/${branch.slug}`}>View live menu</ExternalLinkButton>}
      />

      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Branch sections" idBase="branch" className="mb-6" />

      {tab === 'availability' && (
        <div {...panel('availability')}>
          {availability.status === 'error' ? (
            <ErrorState message={availability.error} onRetry={() => availability.refresh()} />
          ) : availability.status === 'loading' && !availability.rows.length ? (
            <PageSkeleton rows={5} header={false} />
          ) : (
            <div className="space-y-5">
              <AvailabilitySummary rows={availability.rows} />
              <AvailabilityList
                rows={availability.rows}
                onUpdate={availability.update}
                pending={availability.pending}
                currency={currency}
                renderExtra={(row) => <PriceOverride row={row} decimals={decimals} currency={currency} onSave={(v) => savePrice(row, v)} />}
                emptyAction={<Link to="/dashboard/menu"><Button>Go to Master Menu</Button></Link>}
              />
            </div>
          )}
        </div>
      )}

      {tab === 'managers' && (
        <div {...panel('managers')}>
          <BranchManagers branch={branch} />
        </div>
      )}

      {tab === 'qr' && (
        <div {...panel('qr')}>
          <Card className="p-6 sm:p-8">
            <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
              <div className="shrink-0 rounded-2xl border border-gray-200 bg-white p-3 shadow-card">
                {qr ? (
                  <img src={qr.dataUrl} alt={`QR code for ${branch.nameEn}`} className="h-56 w-56" />
                ) : qr === false ? (
                  <div className="flex h-56 w-56 items-center justify-center text-sm text-gray-500">QR preview unavailable</div>
                ) : (
                  <Skeleton className="h-56 w-56" />
                )}
              </div>
              <div className="min-w-0 flex-1 text-center md:text-start">
                <h2 className="text-lg font-semibold text-gray-900">Permanent QR code</h2>
                <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-gray-600 md:mx-0">
                  Print it once for tables, stands or the storefront. Menu changes go live instantly, so this code never needs reprinting.
                </p>
                <div className="mt-4 flex max-w-full items-center justify-center gap-1 md:justify-start">
                  <code className="min-w-0 truncate rounded-md bg-gray-100 px-2.5 py-1.5 text-xs text-gray-700">{branch.menuUrl}</code>
                  <IconButton label="Copy menu link" size="sm" onClick={() => copy(branch.menuUrl, 'Link copied')}>
                    <Copy size={15} />
                  </IconButton>
                </div>
                <div className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
                  <Button onClick={() => branchApi.downloadQr(id, 'png', 2048, branch.slug)}>
                    <Download size={16} aria-hidden="true" /> PNG for print
                  </Button>
                  <Button variant="secondary" onClick={() => branchApi.downloadQr(id, 'svg', 2048, branch.slug)}>
                    <Download size={16} aria-hidden="true" /> SVG vector
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === 'info' && (
        <div {...panel('info')}>
          <Card>
            <CardHeader title="Branch details" description="Shown to customers on this branch's menu." />
            <form onSubmit={saveInfo} className="space-y-5 p-5">
              <div>
                <span className="mb-1.5 block text-[13px] font-medium text-gray-700">Menu link</span>
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <Lock size={14} className="shrink-0 text-gray-400" aria-hidden="true" />
                  <code className="min-w-0 flex-1 truncate text-sm text-gray-700">{branch.menuUrl}</code>
                  <IconButton label="Copy menu link" size="sm" onClick={() => copy(branch.menuUrl, 'Menu link copied')}>
                    <Copy size={14} />
                  </IconButton>
                </div>
                <p className="mt-1.5 text-xs text-gray-500">Permanent. Your printed QR codes point here, so this link never changes.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Branch name (English)" required value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
                <Input label="Branch name (Arabic)" dir="rtl" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
                <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <Input label="Contact number" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <LocationField value={form} onChange={setForm} />

              <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-gray-900">Branch active</div>
                  <div className="text-xs text-gray-500">Inactive branches show “menu not found” to customers.</div>
                </div>
                <Toggle
                  checked={form.status === 'active'}
                  onChange={(v) => setForm({ ...form, status: v ? 'active' : 'inactive' })}
                  tone="success"
                  label="Branch active"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5">
                <Button type="button" variant="danger-ghost" onClick={() => setDeleteOpen(true)}>
                  <Trash2 size={15} aria-hidden="true" /> Delete branch
                </Button>
                <Button type="submit" loading={saving}>Save changes</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete branch?"
        message={`"${branch.nameEn}" and its QR code will stop working permanently, and its branch manager accounts are removed. Printed QR codes for this branch become invalid. This cannot be undone.`}
      />
    </div>
  );
}

function PriceOverride({ row, decimals, currency, onSave }) {
  const [value, setValue] = useState(row.customPrice ?? '');

  useEffect(() => {
    setValue(row.customPrice ?? '');
  }, [row.customPrice]);

  const commit = () => {
    const current = row.customPrice ?? '';
    if (String(value) !== String(current)) onSave(value);
  };

  return (
    <div className="flex flex-col items-end gap-0.5 lg:items-start">
      <input
        type="number"
        inputMode="decimal"
        step="0.001"
        min="0"
        aria-label={`${row.item.nameEn}: price at this branch (${currency}). Leave empty for the base price.`}
        placeholder={Number(row.item.basePrice).toFixed(decimals)}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="tnum h-8 w-24 rounded-md border border-gray-300 bg-white px-2 text-end text-[13px] font-medium text-gray-900 placeholder:text-gray-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
      />
      <span className="text-[11px] text-gray-500">{row.customPrice != null ? 'Branch price' : `Base ${currency}`}</span>
    </div>
  );
}
