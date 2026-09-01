import { useEffect, useState, useRef, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, ChevronLeft, ChevronRight, ImageIcon, UtensilsCrossed, LayoutGrid, Upload,
} from 'lucide-react';
import {
  Button, Input, Textarea, Select, Modal, ConfirmDialog, Toggle, Badge, Card, Spinner, EmptyState, PageHeader,
} from '../../components/ui.jsx';
import { categoryApi, itemApi } from '../../api/endpoints.js';
import { SmartImage } from '../../components/motion.jsx';
import { errMsg } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const fmtPrice = (n, currency = 'OMR') => `${Number(n).toFixed(currency === 'OMR' ? 3 : 2)} ${currency}`;

const LAYOUT_OPTIONS = [
  { v: 'grid', label: 'Standard', hint: '2 per row' },
  { v: 'large', label: 'Large', hint: 'Full width' },
  { v: 'compact', label: 'Compact', hint: '3 per row' },
  { v: 'list', label: 'List', hint: 'Rows + details' },
  { v: 'hero', label: 'Featured', hint: 'Big photo' },
  { v: 'minimal', label: 'Elegant', hint: 'No banner' },
];

// Tiny schematic preview of each public-menu card template
function LayoutPreview({ type }) {
  const banner = <div className="h-1.5 rounded-sm bg-brand-400" />;
  const photo = <div className="mt-0.5 flex-1 rounded-sm bg-orange-100/70" />;
  const cell = (content, key) => (
    <div key={key} className="flex flex-1 flex-col rounded-md bg-gray-100 p-0.5">{content}</div>
  );
  return (
    <div className="mx-auto flex h-12 w-full max-w-[76px] gap-1">
      {type === 'grid' && [0, 1].map((i) => cell(<>{banner}{photo}</>, i))}
      {type === 'large' && cell(
        <>
          {banner}
          <div className="relative mt-0.5 flex-1 rounded-sm bg-orange-100/70">
            <span className="absolute right-0.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-amber-400" />
          </div>
        </>
      )}
      {type === 'compact' && [0, 1, 2].map((i) => cell(<>{banner}{photo}</>, i))}
      {type === 'list' && cell(
        <div className="flex flex-col gap-0.5">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-1 items-center gap-0.5 rounded-sm bg-white p-0.5">
              <span className="h-full w-3 rounded-sm bg-orange-100" />
              <span className="h-1 flex-1 rounded-sm bg-gray-200" />
              <span className="h-2 w-2.5 rounded-sm bg-amber-400" />
            </div>
          ))}
        </div>
      )}
      {type === 'hero' && cell(
        <div className="relative flex-1 overflow-hidden rounded-sm bg-orange-200/80">
          <span className="absolute inset-x-0 bottom-0 h-2.5 bg-gradient-to-t from-gray-700/80 to-transparent" />
          <span className="absolute bottom-0.5 left-0.5 h-1 w-5 rounded-sm bg-white/90" />
          <span className="absolute bottom-0.5 right-0.5 h-1.5 w-2.5 rounded-sm bg-amber-400" />
        </div>
      )}
      {type === 'minimal' && [0, 1].map((i) =>
        cell(
          <>
            {photo}
            <div className="mx-auto mt-0.5 h-1 w-4 rounded-sm bg-gray-300" />
            <div className="mx-auto mt-0.5 h-0.5 w-2.5 rounded-sm bg-brand-400" />
          </>,
          i
        )
      )}
    </div>
  );
}

export default function MenuManagement() {
  const toast = useToast();
  const { restaurant } = useAuth();
  const currency = restaurant?.currency || 'OMR';

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState('all');

  // category modal state
  const [catModal, setCatModal] = useState(null); // null | {mode:'create'} | {mode:'edit', category}
  const [catForm, setCatForm] = useState({ nameEn: '', nameAr: '', layout: 'grid' });
  const [catSaving, setCatSaving] = useState(false);
  const [catDelete, setCatDelete] = useState(null);

  // item modal state
  const [itemModal, setItemModal] = useState(null); // null | {mode:'create'} | {mode:'edit', item}
  const [itemDelete, setItemDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    const [c, i] = await Promise.all([categoryApi.list(), itemApi.list()]);
    setCategories(c.data.categories);
    setItems(i.data.items);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const visibleItems = useMemo(
    () => (activeCat === 'all' ? items : items.filter((i) => i.categoryId === activeCat)),
    [items, activeCat]
  );

  const catName = (id) => categories.find((c) => c._id === id);

  // ---- category handlers ----
  const openCatCreate = () => {
    setCatForm({ nameEn: '', nameAr: '', layout: 'grid' });
    setCatModal({ mode: 'create' });
  };
  const openCatEdit = (category) => {
    setCatForm({ nameEn: category.nameEn, nameAr: category.nameAr, layout: category.layout || 'grid' });
    setCatModal({ mode: 'edit', category });
  };
  const saveCategory = async (e) => {
    e.preventDefault();
    setCatSaving(true);
    try {
      if (catModal.mode === 'create') {
        await categoryApi.create(catForm);
        toast.success('Category added');
      } else {
        await categoryApi.update(catModal.category._id, catForm);
        toast.success('Category updated');
      }
      setCatModal(null);
      await load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setCatSaving(false);
    }
  };
  const confirmCatDelete = async () => {
    setDeleting(true);
    try {
      await categoryApi.remove(catDelete._id);
      toast.success('Category deleted');
      setCatDelete(null);
      if (activeCat === catDelete._id) setActiveCat('all');
      await load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setDeleting(false);
    }
  };
  const moveCategory = async (index, dir) => {
    const next = [...categories];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setCategories(next);
    try {
      await categoryApi.reorder(next.map((c) => c._id));
    } catch (err) {
      toast.error(errMsg(err));
      await load();
    }
  };

  // ---- item handlers ----
  const toggleItemActive = async (item, isActive) => {
    setItems((prev) => prev.map((i) => (i._id === item._id ? { ...i, isActive } : i)));
    try {
      const fd = new FormData();
      fd.append('isActive', isActive);
      await itemApi.update(item._id, fd);
    } catch (err) {
      toast.error(errMsg(err));
      await load();
    }
  };
  const confirmItemDelete = async () => {
    setDeleting(true);
    try {
      await itemApi.remove(itemDelete._id);
      toast.success('Item deleted');
      setItemDelete(null);
      await load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Master Menu"
        subtitle="One menu shared across all branches — control visibility per branch"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={openCatCreate}><LayoutGrid size={16} /> New category</Button>
            <Button onClick={() => setItemModal({ mode: 'create' })} disabled={categories.length === 0}>
              <Plus size={16} /> New item
            </Button>
          </div>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="Start with a category"
          subtitle='Categories group your menu — e.g. "Sandwiches", "Burgers", "Drinks". Add your first one.'
          action={<Button onClick={openCatCreate}><Plus size={16} /> Add category</Button>}
        />
      ) : (
        <>
          {/* Category bar — segmented control; actions expand only on the active pill */}
          <div className="no-scrollbar mb-5 flex items-center gap-1 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-soft ring-1 ring-gray-100">
            <button
              onClick={() => setActiveCat('all')}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                activeCat === 'all'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              All items
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  activeCat === 'all' ? 'bg-white/25' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {items.length}
              </span>
            </button>

            {categories.map((c, index) => {
              const active = activeCat === c._id;
              const count = items.filter((i) => i.categoryId === c._id).length;
              return (
                <div
                  key={c._id}
                  className={`flex shrink-0 items-center rounded-xl transition-all duration-300 ${
                    active ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <button onClick={() => setActiveCat(c._id)} className="flex items-center gap-2 py-2 pe-1 ps-3.5">
                    <span className="text-sm font-semibold">{c.nameEn}</span>
                    <span className={`font-arabic text-sm font-semibold ${active ? 'opacity-80' : 'text-gray-400'}`}>{c.nameAr}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                        active ? 'bg-white/25' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>

                  {/* Management actions — slide open only while this category is selected */}
                  <div
                    className={`flex items-center overflow-hidden transition-all duration-300 ease-out ${
                      active ? 'max-w-36 pe-2 opacity-100' : 'max-w-0 pe-0 opacity-0'
                    }`}
                  >
                    <span className="mx-1.5 h-4 w-px shrink-0 bg-white/30" />
                    <button onClick={() => moveCategory(index, -1)} className="rounded-md p-1 text-white/75 transition-colors hover:bg-white/20 hover:text-white" title="Move left">
                      <ChevronLeft size={14} />
                    </button>
                    <button onClick={() => moveCategory(index, 1)} className="rounded-md p-1 text-white/75 transition-colors hover:bg-white/20 hover:text-white" title="Move right">
                      <ChevronRight size={14} />
                    </button>
                    <button onClick={() => openCatEdit(c)} className="rounded-md p-1 text-white/75 transition-colors hover:bg-white/20 hover:text-white" title="Edit category">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => setCatDelete(c)} className="rounded-md p-1 text-white/75 transition-colors hover:bg-white/20 hover:text-white" title="Delete category">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Items grid — remounts with a soft fade whenever the selected category changes */}
          <div key={activeCat} className="animate-fade-in">
          {visibleItems.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="No items here yet"
              subtitle="Add your first dish with a photo, bilingual name and price."
              action={<Button onClick={() => setItemModal({ mode: 'create' })}><Plus size={16} /> Add item</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleItems.map((item) => (
                <Card key={item._id} className={`overflow-hidden transition-opacity ${item.isActive ? '' : 'opacity-60'}`}>
                  <div className="relative aspect-[4/3] bg-gray-100">
                    {item.imageUrl ? (
                      <SmartImage src={item.imageUrl} alt={item.nameEn} className="h-full w-full" imgClassName="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300"><ImageIcon size={36} /></div>
                    )}
                    {item.badgeText && (
                      <span className="absolute start-2 top-2 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow">
                        {item.badgeText}
                      </span>
                    )}
                    <span className="absolute bottom-2 end-2 rounded-full bg-white/95 px-3 py-1 text-sm font-extrabold text-gray-900 shadow">
                      {fmtPrice(item.basePrice, currency)}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-gray-900">{item.nameEn}</div>
                        <div className="font-arabic truncate text-sm font-semibold text-gray-500" dir="rtl">{item.nameAr}</div>
                      </div>
                      <Badge color="gray">{catName(item.categoryId)?.nameEn || '—'}</Badge>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between border-t border-gray-50 pt-3">
                      <div className="flex items-center gap-2">
                        <Toggle checked={item.isActive} onChange={(v) => toggleItemActive(item, v)} />
                        <span className="text-xs font-medium text-gray-400">{item.isActive ? 'Active' : 'Hidden'}</span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setItemModal({ mode: 'edit', item })} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setItemDelete(item)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          </div>
        </>
      )}

      {/* Category modal */}
      <Modal open={!!catModal} onClose={() => setCatModal(null)} title={catModal?.mode === 'edit' ? 'Edit category' : 'New category'}>
        <form onSubmit={saveCategory} className="space-y-4">
          <Input label="Name (English)" required placeholder="e.g. Sandwiches" value={catForm.nameEn} onChange={(e) => setCatForm({ ...catForm, nameEn: e.target.value })} />
          <Input label="Name (Arabic)" dir="rtl" required placeholder="مثال: ساندويشات" value={catForm.nameAr} onChange={(e) => setCatForm({ ...catForm, nameAr: e.target.value })} />

          {/* Card template on the public menu */}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Card template (public menu)</span>
            <div className="grid grid-cols-3 gap-2">
              {LAYOUT_OPTIONS.map(({ v, label, hint }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCatForm({ ...catForm, layout: v })}
                  className={`rounded-xl p-2.5 ring-1 transition-all ${
                    catForm.layout === v ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <LayoutPreview type={v} />
                  <div className="mt-1.5 text-xs font-bold text-gray-700">{label}</div>
                  <div className="text-[10px] text-gray-400">{hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setCatModal(null)}>Cancel</Button>
            <Button type="submit" loading={catSaving}>{catModal?.mode === 'edit' ? 'Save changes' : 'Add category'}</Button>
          </div>
        </form>
      </Modal>

      {/* Item modal */}
      {itemModal && (
        <ItemEditor
          mode={itemModal.mode}
          item={itemModal.item}
          categories={categories}
          defaultCategory={activeCat !== 'all' ? activeCat : categories[0]?._id}
          currency={currency}
          onClose={() => setItemModal(null)}
          onSaved={async () => {
            setItemModal(null);
            await load();
          }}
        />
      )}

      <ConfirmDialog
        open={!!catDelete}
        onClose={() => setCatDelete(null)}
        onConfirm={confirmCatDelete}
        loading={deleting}
        title="Delete category?"
        message={`"${catDelete?.nameEn}" will be removed. Categories with items cannot be deleted — move or delete the items first.`}
      />
      <ConfirmDialog
        open={!!itemDelete}
        onClose={() => setItemDelete(null)}
        onConfirm={confirmItemDelete}
        loading={deleting}
        title="Delete item?"
        message={`"${itemDelete?.nameEn}" will be permanently removed from your menu and all branches.`}
      />
    </div>
  );
}

function ItemEditor({ mode, item, categories, defaultCategory, currency, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    nameEn: item?.nameEn || '',
    nameAr: item?.nameAr || '',
    descriptionEn: item?.descriptionEn || '',
    descriptionAr: item?.descriptionAr || '',
    basePrice: item?.basePrice ?? '',
    badgeText: item?.badgeText || '',
    categoryId: item?.categoryId || defaultCategory || '',
    isActive: item?.isActive ?? true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(item?.imageUrl || '');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const pickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append('image', imageFile);
      if (mode === 'create') {
        await itemApi.create(fd);
        toast.success('Item added');
      } else {
        await itemApi.update(item._id, fd);
        toast.success('Item updated');
      }
      await onSaved();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={mode === 'edit' ? 'Edit item' : 'New menu item'} wide>
      <form onSubmit={submit} className="space-y-4">
        {/* Image */}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative block w-full overflow-hidden rounded-2xl border-2 border-dashed border-gray-200 transition-colors hover:border-brand-300"
        >
          {preview ? (
            <>
              <img src={preview} alt="" className="aspect-[16/8] w-full object-cover" />
              <span className="absolute bottom-2 end-2 flex items-center gap-1.5 rounded-full bg-gray-900/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                <Upload size={13} /> Change photo
              </span>
            </>
          ) : (
            <div className="flex aspect-[16/7] flex-col items-center justify-center gap-2 text-gray-400">
              <Upload size={22} />
              <span className="text-sm font-medium">Upload food photo</span>
              <span className="text-xs text-gray-300">JPG / PNG, up to 8MB — compressed automatically</span>
            </div>
          )}
        </button>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Name (English)" required placeholder="e.g. Twins Shawarma" value={form.nameEn} onChange={set('nameEn')} />
          <Input label="Name (Arabic)" dir="rtl" required placeholder="مثال: توينز شاورما" value={form.nameAr} onChange={set('nameAr')} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Textarea label="Description (English)" placeholder="Optional" value={form.descriptionEn} onChange={set('descriptionEn')} />
          <Textarea label="Description (Arabic)" dir="rtl" placeholder="اختياري" value={form.descriptionAr} onChange={set('descriptionAr')} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select label="Category" required value={form.categoryId} onChange={set('categoryId')}>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.nameEn}</option>
            ))}
          </Select>
          <Input
            label={`Price (${currency})`}
            type="number"
            step="0.001"
            min="0"
            required
            placeholder="1.995"
            value={form.basePrice}
            onChange={set('basePrice')}
          />
          <Input label="Promo badge" placeholder='e.g. "NEW" or "20% OFF"' value={form.badgeText} onChange={set('badgeText')} />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-gray-800">Active on menu</div>
            <div className="text-xs text-gray-400">Inactive items are hidden from every branch</div>
          </div>
          <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{mode === 'edit' ? 'Save changes' : 'Add item'}</Button>
        </div>
      </form>
    </Modal>
  );
}
