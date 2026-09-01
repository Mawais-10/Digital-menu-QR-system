import { useState, useRef } from 'react';
import { Upload, Check } from 'lucide-react';
import { Card, Button, Input, PageHeader } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { restaurantApi } from '../../api/endpoints.js';
import { errMsg } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';

const THEME_PRESETS = ['#F97316', '#DC2626', '#B45309', '#059669', '#0284C7', '#7C3AED', '#DB2777', '#1F2937'];

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
      toast.success('Branding saved — live on your menu now');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
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

  return (
    <div className="animate-fade-in">
      <PageHeader title="Branding" subtitle="Your identity on the public menu — changes go live instantly" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Form */}
        <Card className="p-6 lg:col-span-3">
          <form onSubmit={save} className="space-y-4">
            {/* Logo */}
            <div>
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Logo</span>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
              <div className="flex items-center gap-4">
                {restaurant?.logoUrl ? (
                  <img src={restaurant.logoUrl} alt="Logo" className="h-16 w-16 rounded-full object-cover ring-2 ring-brand-100" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-600">
                    {form.nameEn[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <Button type="button" variant="secondary" size="sm" loading={uploadingLogo} onClick={() => fileRef.current?.click()}>
                  <Upload size={14} /> {restaurant?.logoUrl ? 'Change logo' : 'Upload logo'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Restaurant name (English)" required value={form.nameEn} onChange={set('nameEn')} />
              <Input label="Restaurant name (Arabic)" dir="rtl" required value={form.nameAr} onChange={set('nameAr')} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Tagline (English)" placeholder="Fresh . Tasty . Made with love" value={form.taglineEn} onChange={set('taglineEn')} />
              <Input label="Tagline (Arabic)" dir="rtl" placeholder="طازج . لذيذ . صنع بحب" value={form.taglineAr} onChange={set('taglineAr')} />
            </div>

            {/* Theme color */}
            <div>
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Theme color</span>
              <div className="flex flex-wrap items-center gap-2.5">
                {THEME_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, themeColor: c })}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}
                  >
                    {form.themeColor.toLowerCase() === c.toLowerCase() && <Check size={15} />}
                  </button>
                ))}
                <label className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-full ring-1 ring-gray-200">
                  <input
                    type="color"
                    value={form.themeColor}
                    onChange={set('themeColor')}
                    className="absolute -inset-2 h-14 w-14 cursor-pointer"
                    title="Custom color"
                  />
                </label>
                <span className="font-mono text-xs text-gray-400">{form.themeColor}</span>
              </div>
            </div>

            {/* Default language */}
            <div>
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Menu default language</span>
              <div className="grid max-w-xs grid-cols-2 gap-2">
                {[
                  { v: 'en', label: 'English first' },
                  { v: 'ar', label: 'العربية أولاً' },
                ].map(({ v, label }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm({ ...form, defaultLanguage: v })}
                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 transition-colors ${v === 'ar' ? 'font-arabic' : ''} ${
                      form.defaultLanguage === v ? 'bg-brand-500 text-white ring-brand-500' : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" loading={saving}>Save branding</Button>
            </div>
          </form>
        </Card>

        {/* Live preview */}
        <div className="lg:col-span-2">
          <Card className="sticky top-6 overflow-hidden">
            <div className="border-b border-gray-50 px-5 py-3 text-xs font-bold uppercase tracking-widest text-gray-400">
              Menu preview
            </div>
            <div className="p-5">
              <div className="overflow-hidden rounded-2xl shadow-soft ring-1 ring-gray-100">
                {/* Mini header */}
                <div className="pattern-arabesque relative px-4 py-5 text-center text-white" style={{ backgroundColor: form.themeColor }}>
                  {restaurant?.logoUrl ? (
                    <img src={restaurant.logoUrl} alt="" className="mx-auto h-12 w-12 rounded-full object-cover ring-2 ring-white/60" />
                  ) : (
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/25 text-lg font-bold ring-2 ring-white/60">
                      {form.nameEn[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="mt-2 text-sm font-extrabold">{form.defaultLanguage === 'ar' ? form.nameAr || form.nameEn : form.nameEn}</div>
                  <div className={`text-xs opacity-80 ${form.defaultLanguage === 'ar' ? '' : 'font-arabic'}`}>
                    {form.defaultLanguage === 'ar' ? form.nameEn : form.nameAr}
                  </div>
                </div>
                {/* Mini card */}
                <div className="bg-gray-50 p-3">
                  <div className="overflow-hidden rounded-xl bg-white shadow-soft">
                    <div className="flex items-center justify-between px-3 py-2 text-[11px] font-bold text-white" style={{ backgroundColor: form.themeColor }}>
                      <span>TWINS SHAWARMA</span>
                      <span className="font-arabic">توينز شاورما</span>
                    </div>
                    <div className="relative flex aspect-[16/7] items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 text-3xl">
                      🌯
                      <span
                        className="absolute bottom-1.5 end-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white"
                        style={{ backgroundColor: form.themeColor }}
                      >
                        1.575 {restaurant?.currency || 'OMR'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-[11px] text-gray-400">Colors apply to your live menu instantly after saving</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
