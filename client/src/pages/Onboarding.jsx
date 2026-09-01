import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, MapPin, PartyPopper, Upload, Check, Download, ArrowRight } from 'lucide-react';
import { Button, Input, LogoMark } from '../components/ui.jsx';
import LocationField from '../components/LocationField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { restaurantApi, branchApi } from '../api/endpoints.js';
import { errMsg } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

const THEME_PRESETS = ['#F97316', '#DC2626', '#B45309', '#059669', '#0284C7', '#7C3AED', '#DB2777', '#1F2937'];

export default function Onboarding() {
  const { user, setUser, setRestaurant } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [profile, setProfile] = useState({
    nameEn: user?.businessName || '',
    nameAr: '',
    themeColor: '#F97316',
    defaultLanguage: 'en',
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const fileRef = useRef();

  const [branch, setBranch] = useState({ nameEn: '', nameAr: '', address: '', phone: user?.phone || '', lat: null, lng: null, mapUrl: '' });
  const [createdBranch, setCreatedBranch] = useState(null);
  const [qr, setQr] = useState(null);

  const pickLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const submitProfile = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await restaurantApi.create(profile);
      setUser(data.user);
      let restaurant = data.restaurant;
      if (logoFile) {
        const res = await restaurantApi.uploadLogo(logoFile);
        restaurant = res.data.restaurant;
      }
      setRestaurant(restaurant);
      setStep(2);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const submitBranch = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await branchApi.create(branch);
      setCreatedBranch(data.branch);
      const qrRes = await branchApi.qrPreview(data.branch._id);
      setQr(qrRes.data);
      setStep(3);
      toast.success('Your menu is live!');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <LogoMark />
          <span className="text-lg font-extrabold text-gray-900">Simat</span>
        </div>

        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  step > s ? 'bg-emerald-500 text-white' : step === s ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step > s ? <Check size={15} /> : s}
              </div>
              {s < 3 && <div className={`h-0.5 w-10 rounded ${step > s ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="rounded-3xl bg-white p-7 shadow-soft ring-1 ring-gray-100">
          {step === 1 && (
            <form onSubmit={submitProfile} className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand-50 p-3 text-brand-500"><Store size={22} /></div>
                <div>
                  <h1 className="text-lg font-extrabold text-gray-900">Restaurant profile</h1>
                  <p className="text-sm text-gray-500">This appears on your public menu</p>
                </div>
              </div>

              <Input label="Restaurant name (English)" required placeholder="e.g. Shawarma House" value={profile.nameEn} onChange={(e) => setProfile({ ...profile, nameEn: e.target.value })} />
              <Input label="Restaurant name (Arabic)" dir="rtl" required placeholder="مثال: بيت الشاورما" value={profile.nameAr} onChange={(e) => setProfile({ ...profile, nameAr: e.target.value })} />

              <div>
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Logo (optional)</span>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickLogo} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-brand-100" />
                  ) : (
                    <div className="rounded-full bg-gray-100 p-2.5 text-gray-400"><Upload size={18} /></div>
                  )}
                  {logoFile ? logoFile.name : 'Upload your logo'}
                </button>
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Theme color</span>
                <div className="flex flex-wrap gap-2.5">
                  {THEME_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setProfile({ ...profile, themeColor: c })}
                      className={`h-9 w-9 rounded-full transition-transform hover:scale-110 ${profile.themeColor === c ? 'ring-2 ring-gray-900 ring-offset-2' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Menu default language</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: 'en', label: 'English first' },
                    { v: 'ar', label: 'العربية أولاً' },
                  ].map(({ v, label }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setProfile({ ...profile, defaultLanguage: v })}
                      className={`rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 transition-colors ${v === 'ar' ? 'font-arabic' : ''} ${
                        profile.defaultLanguage === v ? 'bg-brand-500 text-white ring-brand-500' : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">{error}</p>}
              <Button type="submit" loading={loading} className="w-full" size="lg">Continue</Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={submitBranch} className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand-50 p-3 text-brand-500"><MapPin size={22} /></div>
                <div>
                  <h1 className="text-lg font-extrabold text-gray-900">Add your first branch</h1>
                  <p className="text-sm text-gray-500">Each branch gets its own permanent QR code</p>
                </div>
              </div>

              <Input label="Branch name (English)" required placeholder="e.g. Al Khuwair" value={branch.nameEn} onChange={(e) => setBranch({ ...branch, nameEn: e.target.value })} />
              <Input label="Branch name (Arabic)" dir="rtl" placeholder="مثال: الخوير" value={branch.nameAr} onChange={(e) => setBranch({ ...branch, nameAr: e.target.value })} />
              <Input label="Address" placeholder="Street, area, city" value={branch.address} onChange={(e) => setBranch({ ...branch, address: e.target.value })} />
              <Input label="Contact number" type="tel" placeholder="+968 9xxx xxxx" value={branch.phone} onChange={(e) => setBranch({ ...branch, phone: e.target.value })} />
              <LocationField value={branch} onChange={setBranch} />

              {error && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">{error}</p>}
              <Button type="submit" loading={loading} className="w-full" size="lg">Create branch & generate QR</Button>
            </form>
          )}

          {step === 3 && createdBranch && (
            <div className="text-center">
              <div className="mx-auto mb-4 w-fit rounded-2xl bg-emerald-50 p-3.5 text-emerald-500"><PartyPopper size={26} /></div>
              <h1 className="text-xl font-extrabold text-gray-900">Your menu is live! 🎉</h1>
              <p className="mt-1.5 text-sm text-gray-500">
                This QR code is permanent — print it once, update your menu anytime.
              </p>

              {qr && (
                <div className="mx-auto mt-6 w-fit rounded-3xl bg-white p-4 shadow-lift ring-1 ring-gray-100">
                  <img src={qr.dataUrl} alt="Menu QR code" className="h-48 w-48" />
                </div>
              )}
              <p className="mt-3 break-all rounded-xl bg-gray-50 px-3 py-2 font-mono text-xs text-gray-500">{qr?.url}</p>

              <div className="mt-6 flex flex-col gap-2.5">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => branchApi.downloadQr(createdBranch._id, 'png', 2048, createdBranch.slug)}
                >
                  <Download size={16} /> Download QR (PNG)
                </Button>
                <Button size="lg" className="w-full" onClick={() => navigate('/dashboard/menu')}>
                  Build your menu <ArrowRight size={17} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
