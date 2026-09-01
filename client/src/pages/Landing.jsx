import { Link } from 'react-router-dom';
import { QrCode, Store, Globe2, Zap, Smartphone, RefreshCw, ArrowRight, Check } from 'lucide-react';
import { Button, LogoMark } from '../components/ui.jsx';

const FEATURES = [
  { icon: QrCode, title: 'One QR, forever', text: 'Print your QR code once. Update prices, items and photos anytime — the code never changes.' },
  { icon: Store, title: 'Multi-branch control', text: 'One master menu shared across branches. Toggle item availability and set branch prices individually.' },
  { icon: Globe2, title: 'Arabic + English', text: 'Full bilingual menus with proper RTL layout and beautiful Arabic typography, built for the GCC.' },
  { icon: Zap, title: 'Live in minutes', text: 'Sign up, add your menu, download your QR. No designers, no reprints, no waiting.' },
  { icon: Smartphone, title: 'Premium mobile menus', text: 'Card-style menus with photos, price badges and promo tags — designed for phones first.' },
  { icon: RefreshCw, title: 'Instant updates', text: 'Sold out? Price change? Flip a toggle and every customer sees it on the next scan.' },
];

const STEPS = [
  { n: '1', title: 'Create your restaurant', text: 'Name, logo, theme color — in both languages.' },
  { n: '2', title: 'Build your menu', text: 'Categories, items, photos and prices. Add promo badges like "NEW".' },
  { n: '3', title: 'Print your QR', text: 'Download a print-ready QR per branch. Stick it on tables — done.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="text-lg font-extrabold tracking-tight text-gray-900">Simat</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Link to="/login"><Button variant="ghost">Sign in</Button></Link>
            <Link to="/signup"><Button>Get started free</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pattern-arabesque absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 text-center sm:pt-24">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-4 py-1.5 text-xs font-bold text-brand-600 ring-1 ring-brand-200">
            <QrCode size={13} /> Digital menus for restaurants in Oman & the GCC
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-6xl">
            One QR code.
            <br />
            <span className="text-brand-500">Menu updates forever.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-gray-500 sm:text-lg">
            Build a beautiful bilingual menu, print your QR once, and never reprint again.
            Prices, items and photos update live — across every branch.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/signup">
              <Button size="lg" className="w-64 sm:w-auto">Create your menu <ArrowRight size={17} /></Button>
            </Link>
            <span className="text-xs font-medium text-gray-400">Free to start · No card required</span>
          </div>

          {/* Mock menu card strip */}
          <div className="mx-auto mt-14 flex max-w-2xl justify-center gap-4">
            {[
              { en: 'TWINS SHAWARMA', ar: 'توينز شاورما', price: '1.575', emoji: '🌯', badge: 'NEW' },
              { en: 'MARHABA BURGER', ar: 'مرحبا برجر', price: '1.260', emoji: '🍔' },
              { en: 'CHICKEN STRIPS', ar: 'ستريبس دجاج', price: '1.995', emoji: '🍗' },
            ].map((card, i) => (
              <div
                key={card.en}
                className={`w-44 shrink-0 overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-black/5 transition-transform hover:-translate-y-1.5 ${
                  i === 1 ? 'hidden sm:block' : i === 2 ? 'hidden md:block' : ''
                }`}
              >
                <div className="flex items-center justify-between bg-brand-500 px-2.5 py-1.5 text-[9px] font-extrabold text-white">
                  <span>{card.en}</span>
                  <span className="font-arabic text-[10px]">{card.ar}</span>
                </div>
                <div className="pattern-arabesque relative flex aspect-[4/3] items-center justify-center bg-orange-50/60 text-5xl">
                  {card.emoji}
                  {card.badge && (
                    <span className="absolute start-0 top-2 rounded-e-full bg-red-500 py-0.5 pe-2 ps-1.5 text-[8px] font-extrabold text-white">
                      {card.badge}
                    </span>
                  )}
                  <span className="absolute bottom-1.5 end-1.5 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-extrabold text-white shadow">
                    {card.price} <span className="text-[7px] opacity-80">OMR</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-gray-900">
            Everything your menu needs. <span className="text-brand-500">Nothing it doesn't.</span>
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-gray-100 transition-shadow hover:shadow-lift">
                <div className="w-fit rounded-xl bg-brand-50 p-2.5 text-brand-500"><Icon size={21} /></div>
                <h3 className="mt-4 text-base font-bold text-gray-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-5">
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-gray-900">Live in three steps</h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map(({ n, title, text }) => (
              <div key={n} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-lg font-extrabold text-white shadow-sm shadow-brand-500/40">
                  {n}
                </div>
                <h3 className="mt-4 text-base font-bold text-gray-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-20">
        <div className="pattern-arabesque mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 to-orange-600 px-6 py-14 text-center shadow-lift">
          <h2 className="text-3xl font-extrabold text-white">Ready to ditch paper menus?</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-orange-100">
            Join restaurants across Oman serving beautiful digital menus with a single permanent QR code.
          </p>
          <div className="mt-7 flex flex-col items-center gap-3">
            <Link to="/signup">
              <Button variant="dark" size="lg" className="!bg-white !text-brand-600 hover:!bg-orange-50">
                Get started free <ArrowRight size={17} />
              </Button>
            </Link>
            <div className="flex items-center gap-4 text-xs font-medium text-orange-100">
              <span className="flex items-center gap-1"><Check size={13} /> Bilingual AR/EN</span>
              <span className="flex items-center gap-1"><Check size={13} /> Multi-branch</span>
              <span className="flex items-center gap-1"><Check size={13} /> Permanent QR</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-xs text-gray-400">
        <div className="mb-2 flex items-center justify-center gap-2">
          <LogoMark size={22} />
          <span className="font-extrabold text-gray-600">Simat</span>
        </div>
        © {new Date().getFullYear()} Simat — Digital menus for the GCC
      </footer>
    </div>
  );
}
