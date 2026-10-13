import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, ChevronLeft, ChevronRight, UtensilsCrossed, LayoutGrid, Upload, Search,
  FileSpreadsheet, Download, CheckCircle2, AlertTriangle, FileUp, Maximize2, Crop,
} from 'lucide-react';
import {
  Button, IconButton, Input, Textarea, Select, Modal, ConfirmDialog, Toggle, Badge, Card, EmptyState, ErrorState,
  PageHeader, PageSkeleton, ImageFrame, SegmentedControl, cx,
} from '../../components/ui.jsx';
import { categoryApi, itemApi } from '../../api/endpoints.js';
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
  const photo = <div className="mt-0.5 flex-1 rounded-sm bg-brand-100/80" />;
  const cell = (content, key) => (
    <div key={key} className="flex flex-1 flex-col rounded-md bg-gray-100 p-0.5">{content}</div>
  );
  return (
    <div className="mx-auto flex h-12 w-full max-w-[76px] gap-1" aria-hidden="true">
      {type === 'grid' && [0, 1].map((i) => cell(<>{banner}{photo}</>, i))}
      {type === 'large' && cell(
        <>
          {banner}
          <div className="relative mt-0.5 flex-1 rounded-sm bg-brand-100/80">
            <span className="absolute right-0.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-brand-500" />
          </div>
        </>
      )}
      {type === 'compact' && [0, 1, 2].map((i) => cell(<>{banner}{photo}</>, i))}
      {type === 'list' && cell(
        <div className="flex flex-col gap-0.5">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-1 items-center gap-0.5 rounded-sm bg-white p-0.5">
              <span className="h-full w-3 rounded-sm bg-brand-100" />
              <span className="h-1 flex-1 rounded-sm bg-gray-200" />
              <span className="h-2 w-2.5 rounded-sm bg-brand-500" />
            </div>
          ))}
        </div>
      )}
      {type === 'hero' && cell(
        <div className="relative flex-1 overflow-hidden rounded-sm bg-brand-200/80">
          <span className="absolute inset-x-0 bottom-0 h-2.5 bg-gradient-to-t from-gray-700/80 to-transparent" />
          <span className="absolute bottom-0.5 left-0.5 h-1 w-5 rounded-sm bg-white/90" />
          <span className="absolute bottom-0.5 right-0.5 h-1.5 w-2.5 rounded-sm bg-brand-500" />
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
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [loadError, setLoadError] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [query, setQuery] = useState('');

  // category modal state
  const [catModal, setCatModal] = useState(null); // null | {mode:'create'} | {mode:'edit', category}
  const [catForm, setCatForm] = useState({ nameEn: '', nameAr: '', layout: 'grid' });
  const [catSaving, setCatSaving] = useState(false);
  const [catDelete, setCatDelete] = useState(null);

  // item modal state
  const [itemModal, setItemModal] = useState(null); // null | {mode:'create'} | {mode:'edit', item}
  const [itemDelete, setItemDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async () => {
    const [c, i] = await Promise.all([categoryApi.list(), itemApi.list()]);
    setCategories(c.data.categories);
    setItems(i.data.items);
  }, []);

  const initialLoad = useCallback(async () => {
    setStatus('loading');
    try {
      await load();
      setStatus('ready');
    } catch (err) {
      setLoadError(errMsg(err, 'Could not load the menu'));
      setStatus('error');
    }
  }, [load]);

  useEffect(() => {
    initialLoad();
  }, [initialLoad]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (activeCat !== 'all' && i.categoryId !== activeCat) return false;
      if (!q) return true;
      return i.nameEn?.toLowerCase().includes(q) || i.nameAr?.includes(query.trim());
    });
  }, [items, activeCat, query]);

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

  if (status === 'loading') return <PageSkeleton rows={6} />;
  if (status === 'error') return <ErrorState title="The menu could not be loaded" message={loadError} onRetry={initialLoad} />;

  const activeCategory = categories.find((c) => c._id === activeCat);
  const activeIndex = categories.findIndex((c) => c._id === activeCat);

  return (
    <div>
      <PageHeader
        title="Master Menu"
        subtitle="One menu shared by every branch. Branches control their own visibility and sold-out status."
        action={
          <>
            <Button variant="secondary" onClick={() => setImportOpen(true)}><FileSpreadsheet size={16} aria-hidden="true" /> Import Excel</Button>
            <Button variant="secondary" onClick={openCatCreate}><LayoutGrid size={16} aria-hidden="true" /> New category</Button>
            <Button onClick={() => setItemModal({ mode: 'create' })} disabled={categories.length === 0}>
              <Plus size={16} aria-hidden="true" /> New item
            </Button>
          </>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="Start with a category"
          subtitle='Categories group your menu, for example "Sandwiches", "Burgers" or "Drinks". Add your first one, or import the whole menu from Excel.'
          action={
            <>
              <Button onClick={openCatCreate}><Plus size={16} aria-hidden="true" /> Add category</Button>
              <Button variant="secondary" onClick={() => setImportOpen(true)}><FileSpreadsheet size={16} aria-hidden="true" /> Import Excel</Button>
            </>
          }
        />
      ) : (
        <>
          {/* Category filter */}
          <nav aria-label="Categories" className="no-scrollbar -mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex w-max gap-1.5 pb-1">
              {[{ _id: 'all', nameEn: 'All items' }, ...categories].map((c) => {
                const active = activeCat === c._id;
                const count = c._id === 'all' ? items.length : items.filter((i) => i.categoryId === c._id).length;
                return (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => setActiveCat(c._id)}
                    aria-pressed={active}
                    className={cx(
                      'inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition-colors duration-150',
                      active ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    {c.nameEn}
                    {c.nameAr && <span className={cx('font-arabic font-medium', active ? 'text-white/70' : 'text-gray-500')}>{c.nameAr}</span>}
                    <span className={cx('tnum rounded-full px-1.5 text-[11px]', active ? 'bg-white/20' : 'bg-gray-100 text-gray-600')}>{count}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Toolbar: search + actions for the selected category */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="sm:w-72">
              <Input
                type="search"
                aria-label="Search items"
                placeholder="Search items"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                leading={<Search size={16} />}
              />
            </div>
            {activeCategory && (
              <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-card">
                <span className="max-w-[10rem] truncate px-2 text-[13px] font-semibold text-gray-700">{activeCategory.nameEn}</span>
                <IconButton size="sm" label="Move category earlier" disabled={activeIndex <= 0} onClick={() => moveCategory(activeIndex, -1)}>
                  <ChevronLeft size={16} />
                </IconButton>
                <IconButton size="sm" label="Move category later" disabled={activeIndex >= categories.length - 1} onClick={() => moveCategory(activeIndex, 1)}>
                  <ChevronRight size={16} />
                </IconButton>
                <IconButton size="sm" label="Edit category" onClick={() => openCatEdit(activeCategory)}>
                  <Pencil size={15} />
                </IconButton>
                <IconButton size="sm" variant="danger" label="Delete category" onClick={() => setCatDelete(activeCategory)}>
                  <Trash2 size={15} />
                </IconButton>
              </div>
            )}
          </div>

          {visibleItems.length === 0 ? (
            query ? (
              <EmptyState icon={Search} title="No items match your search" subtitle="Try another name in English or Arabic." />
            ) : (
              <EmptyState
                icon={UtensilsCrossed}
                title="No items here yet"
                subtitle="Add a dish with a photo, bilingual name and price."
                action={<Button onClick={() => setItemModal({ mode: 'create' })}><Plus size={16} aria-hidden="true" /> Add item</Button>}
              />
            )
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleItems.map((item) => (
                <li key={item._id}>
                  <Card className={cx('flex h-full flex-col overflow-hidden transition-opacity', !item.isActive && 'opacity-60')}>
                    <ImageFrame src={item.imageUrl} alt={item.nameEn} fit="contain" ratio="aspect-[4/3]" iconSize={32} className="border-b border-gray-100">
                      {item.badgeText && (
                        <span className="absolute start-2.5 top-2.5 rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
                          {item.badgeText}
                        </span>
                      )}
                      <span className="tnum absolute bottom-2.5 end-2.5 rounded-md bg-white/95 px-2 py-1 text-[13px] font-semibold text-gray-900 shadow-sm ring-1 ring-gray-900/5">
                        {fmtPrice(item.basePrice, currency)}
                      </span>
                    </ImageFrame>
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-gray-900">{item.nameEn}</h3>
                          <div className="font-arabic truncate text-left text-[13px] text-gray-500" dir="rtl">{item.nameAr}</div>
                        </div>
                        <Badge color="gray">{catName(item.categoryId)?.nameEn || '—'}</Badge>
                      </div>
                      <div className="mt-auto pt-3.5" />
                      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                        <label className="flex cursor-pointer items-center gap-2">
                          <Toggle
                            checked={item.isActive}
                            onChange={(v) => toggleItemActive(item, v)}
                            tone="success"
                            size="sm"
                            label={`${item.nameEn}: active on the menu`}
                          />
                          <span className="text-xs font-medium text-gray-600">{item.isActive ? 'Active' : 'Hidden everywhere'}</span>
                        </label>
                        <div className="flex gap-0.5">
                          <IconButton label={`Edit ${item.nameEn}`} onClick={() => setItemModal({ mode: 'edit', item })}>
                            <Pencil size={16} />
                          </IconButton>
                          <IconButton label={`Delete ${item.nameEn}`} variant="danger" onClick={() => setItemDelete(item)}>
                            <Trash2 size={16} />
                          </IconButton>
                        </div>
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Category modal */}
      <Modal open={!!catModal} onClose={() => setCatModal(null)} title={catModal?.mode === 'edit' ? 'Edit category' : 'New category'}>
        <form onSubmit={saveCategory} className="space-y-4">
          <Input label="Name (English)" required placeholder="e.g. Sandwiches" value={catForm.nameEn} onChange={(e) => setCatForm({ ...catForm, nameEn: e.target.value })} />
          <Input label="Name (Arabic)" dir="rtl" required placeholder="مثال: ساندويشات" value={catForm.nameAr} onChange={(e) => setCatForm({ ...catForm, nameAr: e.target.value })} />

          <fieldset>
            <legend className="mb-1.5 block text-[13px] font-medium text-gray-700">Card template on the public menu</legend>
            <div className="grid grid-cols-3 gap-2">
              {LAYOUT_OPTIONS.map(({ v, label, hint }) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={catForm.layout === v}
                  onClick={() => setCatForm({ ...catForm, layout: v })}
                  className={cx(
                    'cursor-pointer rounded-lg border p-2.5 transition-colors duration-150',
                    catForm.layout === v ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-600/20' : 'border-gray-200 bg-white hover:bg-gray-50'
                  )}
                >
                  <LayoutPreview type={v} />
                  <div className="mt-1.5 text-xs font-semibold text-gray-800">{label}</div>
                  <div className="text-[11px] text-gray-500">{hint}</div>
                </button>
              ))}
            </div>
          </fieldset>

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

      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} onDone={load} />}

      <ConfirmDialog
        open={!!catDelete}
        onClose={() => setCatDelete(null)}
        onConfirm={confirmCatDelete}
        loading={deleting}
        title="Delete category?"
        message={`"${catDelete?.nameEn}" will be removed. Categories that still have items cannot be deleted, so move or delete the items first.`}
      />
      <ConfirmDialog
        open={!!itemDelete}
        onClose={() => setItemDelete(null)}
        onConfirm={confirmItemDelete}
        loading={deleting}
        title="Delete item?"
        message={`"${itemDelete?.nameEn}" will be permanently removed from your menu and every branch.`}
      />
    </div>
  );
}

const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp,image/gif,image/avif';

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
  const [fit, setFit] = useState('contain'); // preview framing only — the uploaded file is never cropped
  const [dims, setDims] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const objectUrl = useRef(null);

  useEffect(() => () => objectUrl.current && URL.revokeObjectURL(objectUrl.current), []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const pickFile = (file) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type)) {
      toast.error('Choose a JPG, PNG, WebP, GIF or AVIF image');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image is larger than 8 MB');
      return;
    }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(file);
    setImageFile(file);
    setPreview(objectUrl.current);
    setDims(null);
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

  const orientation = dims ? (dims.w > dims.h * 1.05 ? 'Landscape' : dims.h > dims.w * 1.05 ? 'Portrait' : 'Square') : null;

  return (
    <Modal open onClose={onClose} title={mode === 'edit' ? 'Edit item' : 'New menu item'} size="xl">
      <form onSubmit={submit} className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        {/* Photo */}
        <div className="space-y-3">
          <span className="block text-[13px] font-medium text-gray-700">Photo</span>
          <input ref={fileRef} type="file" accept={ACCEPT_IMAGES} className="sr-only" tabIndex={-1} onChange={(e) => pickFile(e.target.files?.[0])} />
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pickFile(e.dataTransfer.files?.[0]);
            }}
            className={cx('overflow-hidden rounded-xl border transition-colors', dragging ? 'border-brand-600 ring-4 ring-brand-600/15' : 'border-gray-200')}
          >
            {preview ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-checker">
                <img
                  src={preview}
                  alt="Selected item photo"
                  onLoad={(e) => setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                  className={cx('absolute inset-0 h-full w-full', fit === 'cover' ? 'object-cover' : 'object-contain p-[4%]')}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-2 bg-gray-50 px-4 text-center text-gray-500 transition-colors hover:bg-gray-100"
              >
                <Upload size={22} aria-hidden="true" />
                <span className="text-sm font-medium text-gray-700">Upload a food photo</span>
                <span className="text-xs">or drop it here · JPG, PNG, WebP up to 8 MB</span>
              </button>
            )}
          </div>

          {preview && (
            <>
              <SegmentedControl
                label="Preview framing"
                value={fit}
                onChange={setFit}
                fullWidth
                size="sm"
                options={[
                  { value: 'contain', label: 'Fit image', icon: <Maximize2 size={13} aria-hidden="true" /> },
                  { value: 'cover', label: 'Fill frame', icon: <Crop size={13} aria-hidden="true" /> },
                ]}
              />
              <p className="text-xs leading-relaxed text-gray-500">
                {fit === 'contain'
                  ? 'The whole photo, as it appears on the menu cards.'
                  : 'How a cropped thumbnail would look.'}{' '}
                Preview only: your photo is saved uncropped
                {dims ? ` (${dims.w} × ${dims.h}, ${orientation.toLowerCase()})` : ''}.
              </p>
              <Button type="button" variant="secondary" size="sm" className="w-full" onClick={() => fileRef.current?.click()}>
                <Upload size={14} aria-hidden="true" /> Replace photo
              </Button>
            </>
          )}
        </div>

        {/* Details */}
        <div className="min-w-0 space-y-4">
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
              inputMode="decimal"
              step="0.001"
              min="0"
              required
              placeholder="1.995"
              className="tnum"
              value={form.basePrice}
              onChange={set('basePrice')}
            />
            <Input label="Promo badge" placeholder="NEW or 20% OFF" value={form.badgeText} onChange={set('badgeText')} />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-gray-900">Active on the menu</div>
              <div className="text-xs text-gray-500">Inactive items are hidden at every branch.</div>
            </div>
            <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} tone="success" label="Active on the menu" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>{mode === 'edit' ? 'Save changes' : 'Add item'}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function ImportDialog({ onClose, onDone }) {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState(null); // { summary } | { message, errors }
  const fileRef = useRef();

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      await itemApi.downloadTemplate();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setDownloading(false);
    }
  };

  const pick = (f) => {
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) {
      toast.error('Choose an Excel .xlsx file');
      return;
    }
    setFile(f);
    setResult(null);
  };

  const submit = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const { data } = await itemApi.import(file);
      setResult({ summary: data });
      toast.success(`Imported ${data.itemsCreated + data.itemsUpdated} item(s)`);
      await onDone();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors) setResult({ message: data.message, errors: data.errors });
      else toast.error(errMsg(err));
    } finally {
      setImporting(false);
    }
  };

  const summary = result?.summary;
  const steps = [
    'Download the template and fill one row per item. Write a category once and the rows below it belong to it.',
    <>Put each photo in the <b className="font-semibold text-gray-800">Image</b> cell (Excel: Insert, Pictures, Place in Cell) or paste a web link to it.</>,
    'Upload the file. New categories are created automatically, and items with the same name are updated rather than duplicated.',
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title="Import menu from Excel"
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>{summary ? 'Done' : 'Cancel'}</Button>
          {!summary && (
            <Button type="button" onClick={submit} loading={importing} disabled={!file}>
              <Upload size={16} aria-hidden="true" /> {importing ? 'Importing, this can take a minute with photos' : 'Import menu'}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <ol className="space-y-2.5 text-sm text-gray-600">
          {steps.map((text, i) => (
            <li key={i} className="flex gap-3">
              <span className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-800" aria-hidden="true">{i + 1}</span>
              <span className="leading-relaxed">{text}</span>
            </li>
          ))}
        </ol>

        <Button variant="secondary" size="sm" onClick={downloadTemplate} loading={downloading}>
          <Download size={14} aria-hidden="true" /> Download template (.xlsx)
        </Button>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
          className={cx(
            'flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
            dragging ? 'border-brand-600 bg-brand-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          )}
        >
          {file ? (
            <>
              <FileSpreadsheet size={26} className="text-brand-600" aria-hidden="true" />
              <span className="text-sm font-semibold text-gray-900">{file.name}</span>
              <span className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB · click to choose a different file</span>
            </>
          ) : (
            <>
              <FileUp size={26} className="text-gray-400" aria-hidden="true" />
              <span className="text-sm font-medium text-gray-700">Drop your filled Excel file here, or click to browse</span>
              <span className="text-xs text-gray-500">.xlsx up to 40 MB including photos</span>
            </>
          )}
        </button>

        {result?.errors && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
              <AlertTriangle size={16} aria-hidden="true" /> {result.message}
            </div>
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-red-800">
              {result.errors.map((e, i) => (
                <li key={i}>
                  <span className="font-semibold">{e.row ? `Row ${e.row}: ` : ''}</span>
                  {e.message}
                </li>
              ))}
            </ul>
            <div className="mt-2 text-xs text-red-700">Nothing was imported. Fix these rows in Excel and upload again.</div>
          </div>
        )}

        {summary && (
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4" role="status">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-900">
              <CheckCircle2 size={16} aria-hidden="true" /> Import complete
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-brand-900 sm:grid-cols-4">
              {[
                [summary.itemsCreated, 'items added'],
                [summary.itemsUpdated, 'items updated'],
                [summary.categoriesCreated, 'categories added'],
                [summary.imagesUploaded, 'photos uploaded'],
              ].map(([v, l]) => (
                <div key={l} className="rounded-lg bg-white/80 px-3 py-2">
                  <div className="tnum text-lg font-semibold">{v}</div>
                  <div>{l}</div>
                </div>
              ))}
            </div>
            {summary.warnings?.length > 0 && (
              <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-xs text-amber-900">
                {summary.warnings.map((w, i) => (
                  <li key={i}><span className="font-semibold">Row {w.row}: </span>{w.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
