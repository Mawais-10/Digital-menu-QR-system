import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Download, Copy, ExternalLink, Lock, Trash2, ImageIcon, Info, ListChecks, QrCode as QrIcon,
} from 'lucide-react';
import { Button, Input, Card, Spinner, Toggle, ConfirmDialog, Badge, EmptyState } from '../../components/ui.jsx';
import LocationField from '../../components/LocationField.jsx';
import { branchApi } from '../../api/endpoints.js';
import { errMsg } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const TABS = [
  { id: 'availability', label: 'Menu availability', icon: ListChecks },
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
  const [tab, setTab] = useState('availability');
  const [loading, setLoading] = useState(true);

  // availability
  const [rows, setRows] = useState([]);
  // qr
  const [qr, setQr] = useState(null);
  // info form
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([branchApi.get(id), branchApi.items(id), branchApi.qrPreview(id)])
      .then(([b, it, q]) => {
        setBranch(b.data.branch);
        setForm({
          nameEn: b.data.branch.nameEn,
          nameAr: b.data.branch.nameAr || '',
          address: b.data.branch.address || '',
          phone: b.data.branch.phone || '',
          status: b.data.branch.status,
          lat: b.data.branch.lat ?? null,
          lng: b.data.branch.lng ?? null,
          mapUrl: b.data.branch.mapUrl || '',
        });
        setRows(it.data.items);
        setQr(q.data);
      })
      .catch(() => navigate('/dashboard/branches'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      const cat = row.item.categoryId;
      const key = cat?._id || 'none';
      if (!map.has(key)) map.set(key, { category: cat, rows: [] });
      map.get(key).rows.push(row);
    }
    return [...map.values()].sort((a, b) => (a.category?.sortOrder ?? 0) - (b.category?.sortOrder ?? 0));
  }, [rows]);

  const setRow = (itemId, patch) => {
    setRows((prev) => prev.map((r) => (r.item._id === itemId ? { ...r, ...patch } : r)));
  };

  const toggleAvailability = async (row, isAvailable) => {
    setRow(row.item._id, { isAvailable });
    try {
      await branchApi.updateItem(id, row.item._id, { isAvailable });
    } catch (err) {
      toast.error(errMsg(err));
      setRow(row.item._id, { isAvailable: !isAvailable });
    }
  };

  const savePrice = async (row, raw) => {
    const trimmed = String(raw).trim();
    const customPrice = trimmed === '' ? null : Number(trimmed);
    if (customPrice !== null && (Number.isNaN(customPrice) || customPrice < 0)) {
      toast.error('Invalid price');
      return;
    }
    try {
      const { data } = await branchApi.updateItem(id, row.item._id, { customPrice });
      setRow(row.item._id, { customPrice: data.customPrice, effectivePrice: data.effectivePrice });
      toast.success(customPrice === null ? 'Reverted to base price' : 'Branch price saved');
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

  if (loading || !branch) return <Spinner />;

  return (
    <div className="animate-fade-in">
      <Link to="/dashboard/branches" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-700">
        <ArrowLeft size={15} /> All branches
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-gray-900">{branch.nameEn}</h1>
            <Badge color={branch.status === 'active' ? 'green' : 'gray'}>{branch.status}</Badge>
          </div>
          <div className="mt-1 flex items-center gap-1.5 font-mono text-xs text-gray-400">
            <Lock size={11} /> {branch.menuUrl}
          </div>
        </div>
        <a href={`/menu/${branch.slug}`} target="_blank" rel="noreferrer">
          <Button variant="secondary"><ExternalLink size={15} /> View live menu</Button>
        </a>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-2xl bg-gray-100 p-1">
        {TABS.map(({ id: t, label, icon: Icon }) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={16} /> <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {tab === 'availability' && (
        <div className="space-y-6">
          {rows.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="Your master menu is empty"
              subtitle="Add items in the Master Menu first, then control their visibility here."
              action={<Link to="/dashboard/menu"><Button>Go to Master Menu</Button></Link>}
            />
          ) : (
            grouped.map(({ category, rows: catRows }) => (
              <Card key={category?._id || 'none'} className="overflow-hidden">
                <div className="border-b border-gray-50 bg-gray-50/60 px-5 py-3">
                  <span className="text-sm font-bold text-gray-800">{category?.nameEn || 'Uncategorized'}</span>
                  {category?.nameAr && <span className="font-arabic ms-2 text-sm text-gray-400">{category.nameAr}</span>}
                </div>
                <div className="divide-y divide-gray-50">
                  {catRows.map((row) => (
                    <div key={row.item._id} className={`flex items-center gap-4 px-5 py-3.5 transition-opacity ${row.isAvailable ? '' : 'opacity-50'}`}>
                      {row.item.imageUrl ? (
                        <img src={row.item.imageUrl} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-300"><ImageIcon size={17} /></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-gray-800">{row.item.nameEn}</div>
                        <div className="font-arabic truncate text-xs text-gray-400" dir="rtl">{row.item.nameAr}</div>
                      </div>
                      <div className="hidden text-end sm:block">
                        <div className="text-xs text-gray-400">Base: {Number(row.item.basePrice).toFixed(decimals)}</div>
                        <PriceOverride row={row} decimals={decimals} onSave={(v) => savePrice(row, v)} />
                      </div>
                      <Toggle checked={row.isAvailable} onChange={(v) => toggleAvailability(row, v)} />
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'qr' && qr && (
        <Card className="p-7">
          <div className="flex flex-col items-center gap-7 md:flex-row md:items-start">
            <div className="rounded-3xl bg-white p-4 shadow-lift ring-1 ring-gray-100">
              <img src={qr.dataUrl} alt="QR code" className="h-56 w-56" />
            </div>
            <div className="flex-1 text-center md:text-start">
              <h3 className="text-lg font-bold text-gray-900">Permanent QR code</h3>
              <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-gray-500 md:mx-0">
                Print this once — on tables, stands or storefronts. Menu changes go live instantly, and this code never needs reprinting.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 md:justify-start">
                <code className="max-w-full truncate rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-500">{qr.url}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(qr.url); toast.success('Link copied'); }}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <Copy size={15} />
                </button>
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-2.5 md:justify-start">
                <Button onClick={() => branchApi.downloadQr(id, 'png', 2048, branch.slug)}>
                  <Download size={16} /> PNG — print ready
                </Button>
                <Button variant="secondary" onClick={() => branchApi.downloadQr(id, 'svg', 2048, branch.slug)}>
                  <Download size={16} /> SVG — vector
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {tab === 'info' && form && (
        <Card className="p-6">
          <form onSubmit={saveInfo} className="max-w-lg space-y-4">
            {/* Permanent menu link — read-only, printed QR codes point here */}
            <div>
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Menu link</span>
              <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 px-3.5 py-2.5 ring-1 ring-gray-200">
                <Lock size={14} className="shrink-0 text-gray-400" />
                <code className="min-w-0 flex-1 truncate text-sm text-gray-600">{branch.menuUrl}</code>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(branch.menuUrl); toast.success('Menu link copied'); }}
                  className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-gray-700"
                  title="Copy link"
                >
                  <Copy size={14} />
                </button>
              </div>
              <span className="mt-1 block text-xs text-gray-400">
                Permanent — your printed QR codes point here, so this link never changes.
              </span>
            </div>

            <Input label="Branch name (English)" required value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
            <Input label="Branch name (Arabic)" dir="rtl" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
            <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Input label="Contact number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <LocationField value={form} onChange={setForm} />

            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-gray-800">Branch active</div>
                <div className="text-xs text-gray-400">Inactive branches show "menu not found" to customers</div>
              </div>
              <Toggle checked={form.status === 'active'} onChange={(v) => setForm({ ...form, status: v ? 'active' : 'inactive' })} />
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button type="button" variant="ghost" className="!text-red-500 hover:!bg-red-50" onClick={() => setDeleteOpen(true)}>
                <Trash2 size={15} /> Delete branch
              </Button>
              <Button type="submit" loading={saving}>Save changes</Button>
            </div>
          </form>
        </Card>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete branch?"
        message={`"${branch.nameEn}" and its QR code will stop working permanently. Any printed QR codes for this branch will become invalid. This cannot be undone.`}
      />
    </div>
  );
}

function PriceOverride({ row, decimals, onSave }) {
  const [value, setValue] = useState(row.customPrice ?? '');

  useEffect(() => {
    setValue(row.customPrice ?? '');
  }, [row.customPrice]);

  return (
    <div className="mt-0.5 flex items-center gap-1.5">
      <input
        type="number"
        step="0.001"
        min="0"
        placeholder={Number(row.item.basePrice).toFixed(decimals)}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          const current = row.customPrice ?? '';
          if (String(value) !== String(current)) onSave(value);
        }}
        className="w-24 rounded-lg bg-gray-50 px-2.5 py-1.5 text-end text-xs font-semibold text-gray-700 ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        title="Branch price override — leave empty to use base price"
      />
    </div>
  );
}
