import { useState, useRef } from 'react';
import { Upload, Check, UtensilsCrossed } from 'lucide-react';
import { Card, CardHeader, Button, Input, PageHeader, SegmentedControl, cx } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { restaurantApi } from '../../api/endpoints.js';
import { errMsg } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';

const THEME_PRESETS = [
  { c: '#F97316', n: 'Orange' },
  { c: '#DC2626', n: 'Red' },
  { c: '#B45309', n: 'Amber' },
  { c: '#059669', n: 'Green' },
  { c: '#0284C7', n: 'Blue' },
  { c: '#7C3AED', n: 'Violet' },
  { c: '#DB2777', n: 'Pink' },
  { c: '#1F2937', n: 'Charcoal' },
];

export default function Branding() {
  const { restaurant, setRestaurant } = useAuth();
  const toast = useToast();
  const fileRef = useRef();

  const [form, setForm] = useState({
    nameEn: restaurant?.nameEn || '',
    nameAr: restaurant?.nameAr || '',
    taglineEn: restaurant?.taglineEn || '',
    taglineAr: restaurant?.taglineAr || '',
    themeColor: restaurant?.themeColor || '#F97316',
    defaultLanguage: restaurant?.defaultLanguage || 'en',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await restaurantApi.update(form);
      setRestaurant(data.restaurant);
      toast.success('Branding saved and live on your menu');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { data } = await restaurantApi.uploadLogo(file);
      setRestaurant(data.restaurant);
      toast.success('Logo updated');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setUploadingLogo(false);
    }
  };

  const isAr = form.defaultLanguage === 'ar';

  return (
    <div>
      <PageHeader title="Branding" subtitle="Your identity on the public menu. Changes go live as soon as you save." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader title="Brand profile" description="Name, logo, color and the language customers see first." />
          <form onSubmit={save} className="space-y-6 p-5">
            {/* Logo */}
            <div>
              <span className="mb-1.5 block text-[13px] font-medium text-gray-700">Logo</span>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="sr-only" tabIndex={-1} onChange={uploadLogo} />
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-checker">
                  {restaurant?.logoUrl ? (
                    <img src={restaurant.logoUrl} alt="Current logo" className="h-full w-full object-contain p-2" />
                  ) : (
                    <span className="text-2xl font-semibold text-brand-700" aria-hidden="true">{form.nameEn[0]?.toUpperCase() || '?'}</span>
                  )}
                </div>
                <div>
                  <Button type="button" variant="secondary" size="sm" loading={uploadingLogo} onClick={() => fileRef.current?.click()}>
                    <Upload size={14} aria-hidden="true" /> {restaurant?.logoUrl ? 'Change logo' : 'Upload logo'}
                  </Button>
                  <p className="mt-1.5 text-xs text-gray-500">PNG with a transparent background works best. Also used in your QR codes.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Restaurant name (English)" required value={form.nameEn} onChange={set('nameEn')} />
              <Input label="Restaurant name (Arabic)" dir="rtl" required value={form.nameAr} onChange={set('nameAr')} />
              <Input label="Tagline (English)" placeholder="Fresh, tasty, made with love" value={form.taglineEn} onChange={set('taglineEn')} />
              <Input label="Tagline (Arabic)" dir="rtl" placeholder="طازج . لذيذ . صنع بحب" value={form.taglineAr} onChange={set('taglineAr')} />
            </div>

            {/* Theme color */}
            <fieldset>
              <legend className="mb-2 block text-[13px] font-medium text-gray-700">Theme color</legend>
              <div className="flex flex-wrap items-center gap-2">
                {THEME_PRESETS.map(({ c, n }) => {
                  const active = form.themeColor.toLowerCase() === c.toLowerCase();
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-label={n}
                      aria-pressed={active}
                      onClick={() => setForm({ ...form, themeColor: c })}
                      className={cx(
                        'flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white transition-[box-shadow] duration-150 hover:ring-2 hover:ring-gray-300 hover:ring-offset-2',
                        active && 'ring-2 ring-gray-900 ring-offset-2'
                      )}
                      style={{ backgroundColor: c }}
                    >
                      {active && <Check size={15} aria-hidden="true" />}
                    </button>
                  );
                })}
                <label className="relative ms-1 flex h-9 cursor-pointer items-center gap-2 rounded-full border border-gray-300 bg-white pe-3 ps-1 shadow-card hover:bg-gray-50">
                  <span className="relative h-7 w-7 overflow-hidden rounded-full ring-1 ring-gray-200" style={{ backgroundColor: form.themeColor }}>
                    <input
                      type="color"
                      value={form.themeColor}
                      onChange={set('themeColor')}
                      className="absolute -inset-2 h-12 w-12 cursor-pointer opacity-0"
                      aria-label="Custom theme color"
                    />
                  </span>
                  <span className="font-mono text-xs uppercase text-gray-700">{form.themeColor}</span>
                </label>
              </div>
            </fieldset>

            <div>
              <span className="mb-2 block text-[13px] font-medium text-gray-700" aria-hidden="true">Menu default language</span>
              <SegmentedControl
                label="Menu default language"
                value={form.defaultLanguage}
                onChange={(v) => setForm({ ...form, defaultLanguage: v })}
                options={[
                  { value: 'en', label: 'English first' },
                  { value: 'ar', label: <span className="font-arabic">العربية أولاً</span> },
                ]}
              />
            </div>

            <div className="flex justify-end border-t border-gray-100 pt-5">
              <Button type="submit" loading={saving}>Save branding</Button>
            </div>
          </form>
        </Card>

        {/* Live preview */}
        <div>
          <Card className="sticky top-6 overflow-hidden">
            <CardHeader title="Preview" description="A sketch of your menu header and a card." />
            <div className="p-5">
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="pattern-arabesque px-4 py-5 text-center text-white" style={{ backgroundColor: form.themeColor }}>
                  {restaurant?.logoUrl ? (
                    <img src={restaurant.logoUrl} alt="" className="mx-auto h-12 w-auto max-w-[140px] rounded-md object-contain" />
                  ) : (
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/25 text-lg font-semibold ring-2 ring-white/60" aria-hidden="true">
                      {form.nameEn[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="mt-2 text-sm font-semibold">{isAr ? form.nameAr || form.nameEn : form.nameEn}</div>
                  <div className={cx('text-xs opacity-85', !isAr && 'font-arabic')}>{isAr ? form.nameEn : form.nameAr}</div>
                </div>
                <div className="bg-gray-50 p-3">
                  <div className="overflow-hidden rounded-lg bg-white shadow-card">
                    <div className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-white" style={{ backgroundColor: form.themeColor }}>
                      <span>TWINS SHAWARMA</span>
                      <span className="font-arabic">توينز شاورما</span>
                    </div>
                    <div className="relative flex aspect-[16/7] items-center justify-center bg-gray-100 text-gray-400">
                      <UtensilsCrossed size={28} aria-hidden="true" />
                      <span className="tnum absolute bottom-1.5 end-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: form.themeColor }}>
                        1.575 {restaurant?.currency || 'OMR'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-gray-500">Colors apply to your live menu after saving.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
