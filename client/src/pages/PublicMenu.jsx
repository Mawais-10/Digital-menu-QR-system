import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Phone, X, UtensilsCrossed, SearchX, Navigation } from 'lucide-react';
import { publicApi } from '../api/endpoints.js';
import { Reveal, SmartImage } from '../components/motion.jsx';

const fmtPrice = (n, currency = 'OMR') => Number(n).toFixed(currency === 'OMR' ? 3 : 2);

// The price-tag orange from the reference menu (independent of the restaurant theme color)
const TAG_GRADIENT = 'linear-gradient(180deg, #FBAB2C 0%, #F0870B 100%)';
const RIBBON_GRADIENT = 'linear-gradient(180deg, #EF4444 0%, #C81E1E 100%)';

// Foreground contrast for the theme color (guards very light brand colors)
function readableOn(hex) {
  try {
    const c = hex.replace('#', '');
    const full = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
    return (r * 299 + g * 587 + b * 114) / 1000 > 186 ? '#1F2937' : '#FFFFFF';
  } catch {
    return '#FFFFFF';
  }
}

export default function PublicMenu() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound
  const [lang, setLang] = useState('en');
  const [activeCat, setActiveCat] = useState(null);
  const [detail, setDetail] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const sectionRefs = useRef({});
  const pillRefs = useRef({});
  const clickScrolling = useRef(false);

  // Condense the sticky bar with a mini logo once the header is out of view
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 190);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    publicApi
      .menu(slug)
      .then(({ data }) => {
        setData(data);
        const saved = localStorage.getItem(`qm_lang_${slug}`);
        setLang(saved === 'ar' || saved === 'en' ? saved : data.restaurant.defaultLanguage);
        setActiveCat(data.categories[0]?.id || null);
        setStatus('ready');
        document.title = `${data.restaurant.nameEn} — Menu`;
      })
      .catch(() => setStatus('notfound'));
  }, [slug]);

  const switchLang = (l) => {
    setLang(l);
    localStorage.setItem(`qm_lang_${slug}`, l);
  };

  const isAr = lang === 'ar';
  const theme = data?.restaurant.themeColor || '#F97316';
  const onTheme = readableOn(theme);

  const itemsByCat = useMemo(() => {
    if (!data) return new Map();
    const map = new Map();
    for (const item of data.items) {
      const key = item.categoryId;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return map;
  }, [data]);

  // Scrollspy — highlight the category currently in view
  useEffect(() => {
    if (status !== 'ready' || !data) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (clickScrolling.current) return;
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
          setActiveCat(top.target.dataset.cat);
        }
      },
      { rootMargin: '-120px 0px -55% 0px' }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [status, data, lang]);

  useEffect(() => {
    pillRefs.current[activeCat]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeCat]);

  const scrollToCat = (id) => {
    setActiveCat(id);
    clickScrolling.current = true;
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => (clickScrolling.current = false), 700);
  };

  if (status === 'loading') return <MenuSkeleton />;
  if (status === 'notfound') return <NotFound />;

  const { restaurant, branch, categories } = data;
  const name = (obj, en, ar) => (isAr ? obj[ar] || obj[en] : obj[en] || obj[ar]);

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className={`pattern-arabesque min-h-screen pb-10 ${isAr ? 'font-arabic' : ''}`}
      style={{ '--brand': theme, backgroundColor: '#FAF8F5' }}
    >
      {/* ===== Cover-style header (like the printed menu front page) ===== */}
      <header className="relative pb-6 pt-6 text-center">
        {/* Language toggle */}
        <div className="absolute end-4 top-4 z-10">
          <div className="flex rounded-full bg-white p-1 shadow-soft ring-1 ring-black/5">
            {[
              { v: 'en', label: 'EN' },
              { v: 'ar', label: 'عربي' },
            ].map(({ v, label }) => (
              <button
                key={v}
                onClick={() => switchLang(v)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${v === 'ar' ? 'font-arabic' : ''}`}
                style={lang === v ? { backgroundColor: theme, color: onTheme } : { color: '#6B7280' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-lg px-6">
          <Reveal>
            {restaurant.logoUrl ? (
              <SmartImage
                src={restaurant.logoUrl}
                alt={restaurant.nameEn}
                eager
                className="mx-auto h-24 w-24 rounded-full border-4 border-white shadow-lift"
                imgClassName="h-full w-full object-cover"
              />
            ) : (
              <div
                className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-white text-4xl font-extrabold shadow-lift"
                style={{ backgroundColor: theme, color: onTheme }}
              >
                {restaurant.nameEn[0]}
              </div>
            )}
          </Reveal>

          <Reveal delay={90}>
            <h1 className={`mt-4 text-3xl font-extrabold tracking-tight ${isAr ? '' : 'uppercase'}`} style={{ color: theme }}>
              {name(restaurant, 'nameEn', 'nameAr')}
            </h1>
          </Reveal>

          {/* Bilingual tagline with the dashed decoration from the reference cover */}
          {(restaurant.taglineEn || restaurant.taglineAr) && (
            <Reveal delay={170}>
              <div className="mt-3 flex items-center justify-center gap-3">
                <span className="h-px w-10 bg-gray-300" />
                <p
                  className={
                    isAr
                      ? 'font-arabic text-sm font-bold text-gray-600'
                      : 'font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500'
                  }
                >
                  {name(restaurant, 'taglineEn', 'taglineAr')}
                </p>
                <span className="h-px w-10 bg-gray-300" />
              </div>
            </Reveal>
          )}

          <Reveal delay={240}>
            <span className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-gray-600 shadow-soft ring-1 ring-black/5">
              <MapPin size={12} style={{ color: theme }} />
              {name(branch, 'nameEn', 'nameAr')}
            </span>
          </Reveal>
        </div>
      </header>

      {/* ===== Sticky category pills ===== */}
      <nav className="sticky top-0 z-20 border-b border-black/5 py-2.5 backdrop-blur" style={{ backgroundColor: '#FAF8F5EE' }}>
        <div className="mx-auto max-w-2xl px-3.5">
          {/* Segmented control container */}
          <div className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-soft ring-1 ring-black/5">
            {/* Mini logo slides in once the header scrolls away */}
            <div
              className={`shrink-0 overflow-hidden transition-all duration-300 ease-out ${
                scrolled ? 'me-1 w-8 opacity-100' : 'w-0 opacity-0'
              }`}
            >
              {restaurant.logoUrl ? (
                <img src={restaurant.logoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold"
                  style={{ backgroundColor: theme, color: onTheme }}
                >
                  {restaurant.nameEn[0]}
                </div>
              )}
            </div>
            {categories.map((c) => (
              <button
                key={c.id}
                ref={(el) => (pillRefs.current[c.id] = el)}
                onClick={() => scrollToCat(c.id)}
                className="shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition-all duration-300"
                style={
                  activeCat === c.id
                    ? { backgroundColor: theme, color: onTheme, boxShadow: `0 4px 12px ${theme}4D` }
                    : { color: '#4B5563' }
                }
              >
                {name(c, 'nameEn', 'nameAr')}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ===== Sections ===== */}
      <main key={lang} className="animate-fade-in mx-auto max-w-2xl px-3.5">
        {categories.map((c) => {
          const catItems = itemsByCat.get(c.id) || [];
          const layout = c.layout || 'grid';
          const { Comp: CardComp, wrap: wrapClass } = LAYOUT_CONFIG[layout] || LAYOUT_CONFIG.grid;
          return (
            <section
              key={c.id}
              data-cat={c.id}
              ref={(el) => (sectionRefs.current[c.id] = el)}
              className="cv-auto scroll-mt-20 pt-6"
            >
              {/* Section title — banner style, like a category divider in the printed menu */}
              <div
                className="mb-3 flex items-center justify-center rounded-lg px-4 py-2 shadow-sm"
                style={{ backgroundColor: theme, color: onTheme }}
              >
                <span className={`font-extrabold ${isAr ? 'font-arabic text-[15px]' : 'text-sm uppercase tracking-wider'}`}>
                  {name(c, 'nameEn', 'nameAr')}
                </span>
              </div>

              <div className={wrapClass}>
                {catItems.map((item) => (
                  <CardComp
                    key={item.id}
                    item={item}
                    theme={theme}
                    onTheme={onTheme}
                    isAr={isAr}
                    currency={restaurant.currency}
                    onOpen={() => setDetail(item)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {data.items.length === 0 && (
          <div className="flex flex-col items-center py-20 text-center text-gray-400">
            <UtensilsCrossed size={36} />
            <p className="mt-3 text-sm font-medium">{isAr ? 'القائمة قيد التحضير' : 'Menu coming soon'}</p>
          </div>
        )}

        {/* ===== Footer — contact chips like the cover page ===== */}
        <footer className="mt-12 border-t border-black/5 pt-6 text-center">
          {(branch.address || branch.phone || branch.mapLink) && (
            <div className="mb-5 flex flex-wrap items-center justify-center gap-2.5">
              {branch.mapLink ? (
                // Tappable — opens the maps app with directions to the branch
                <a
                  href={branch.mapLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-soft ring-1 ring-black/5 transition-all active:scale-[0.97]"
                >
                  <MapPin size={13} style={{ color: theme }} />
                  {branch.address || (isAr ? 'موقع الفرع' : 'Branch location')}
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold text-white"
                    style={{ backgroundColor: theme, color: onTheme }}
                  >
                    <Navigation size={10} />
                    {isAr ? 'الاتجاهات' : 'Directions'}
                  </span>
                </a>
              ) : (
                branch.address && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-soft ring-1 ring-black/5">
                    <MapPin size={13} style={{ color: theme }} />{branch.address}
                  </span>
                )
              )}
              {branch.phone && (
                <a
                  href={`tel:${branch.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold shadow-soft ring-1 ring-black/5 transition-all active:scale-[0.97]"
                  style={{ color: theme }}
                >
                  <Phone size={13} />{branch.phone}
                </a>
              )}
            </div>
          )}
          <p className="pb-2 text-[11px] font-medium tracking-wide text-gray-300">
            Powered by <span className="font-bold text-gray-400">Simat</span>
          </p>
        </footer>
      </main>

      {/* ===== Item detail bottom sheet ===== */}
      {detail && (
        <div className="fixed inset-0 z-50" onClick={() => setDetail(null)}>
          <div className="animate-backdrop absolute inset-0 bg-gray-900/55 backdrop-blur-[2px]" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-sheet-up absolute inset-x-0 bottom-0 mx-auto max-h-[88vh] max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-lift"
          >
            <div className="sticky top-0 z-10 flex justify-center bg-gradient-to-b from-white to-transparent pb-1 pt-2.5">
              <div className="h-1 w-10 rounded-full bg-gray-200" />
            </div>
            <button
              onClick={() => setDetail(null)}
              className="absolute end-3.5 top-3.5 z-20 rounded-full bg-gray-900/60 p-2 text-white backdrop-blur"
            >
              <X size={16} />
            </button>

            {/* Banner inside the sheet, matching the card style */}
            <div className="flex items-center justify-center px-10 py-3" style={{ backgroundColor: theme, color: onTheme }}>
              <span className={`truncate font-extrabold ${isAr ? 'font-arabic text-lg' : 'text-base uppercase tracking-wide'}`}>
                {isAr ? detail.nameAr || detail.nameEn : detail.nameEn || detail.nameAr}
              </span>
            </div>

            {detail.imageUrl ? (
              <div className="pattern-arabesque bg-white p-3">
                <SmartImage src={detail.imageUrl} alt="" eager className="w-full" imgClassName="mx-auto aspect-[16/10] w-full object-contain" />
              </div>
            ) : (
              <div className="pattern-arabesque flex aspect-[16/9] items-center justify-center bg-white text-gray-200">
                <UtensilsCrossed size={44} />
              </div>
            )}

            <div className="p-5 pb-8">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {(detail.descriptionEn || detail.descriptionAr) && (
                    <p className="text-sm leading-relaxed text-gray-600">
                      {isAr ? detail.descriptionAr || detail.descriptionEn : detail.descriptionEn || detail.descriptionAr}
                    </p>
                  )}
                  {detail.badgeText && (
                    <span
                      className="mt-3 inline-block rounded-md px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white"
                      style={{ background: RIBBON_GRADIENT }}
                    >
                      {detail.badgeText}
                    </span>
                  )}
                </div>
                <span
                  className="flex shrink-0 flex-col items-center rounded-xl px-4 py-2 text-white shadow-md"
                  style={{ background: TAG_GRADIENT }}
                >
                  <span className="text-lg font-extrabold leading-tight">{fmtPrice(detail.price, restaurant.currency)}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider opacity-90">{restaurant.currency}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Layout registry ---------- */
const LAYOUT_CONFIG = {
  grid: { get Comp() { return GridCard; }, wrap: 'grid grid-cols-2 gap-3' },
  large: { get Comp() { return LargeCard; }, wrap: 'space-y-3.5' },
  compact: { get Comp() { return CompactCard; }, wrap: 'grid grid-cols-3 gap-2.5' },
  list: { get Comp() { return ListCard; }, wrap: 'space-y-2.5' },
  hero: { get Comp() { return HeroCard; }, wrap: 'space-y-4' },
  minimal: { get Comp() { return MinimalCard; }, wrap: 'grid grid-cols-2 gap-3' },
};

/* ---------- Shared card pieces ---------- */

// Red "NEW"-style ribbon, top corner, slightly tilted like the printed menu
function Ribbon({ text, small }) {
  return (
    <span
      className={`absolute end-1.5 top-1.5 z-10 rotate-6 rounded-md text-white shadow-md ${
        small ? 'px-1.5 py-0.5 text-[8px]' : 'px-2.5 py-1 text-[10px]'
      } font-extrabold uppercase tracking-wider`}
      style={{ background: RIBBON_GRADIENT }}
    >
      {text}
    </span>
  );
}

// Orange price tag (number + OMR beneath) — the reference menu's signature tag
function PriceTag({ price, currency, small }) {
  return (
    <span
      className={`absolute bottom-1.5 end-1.5 flex flex-col items-center rounded-lg text-white shadow-md ${
        small ? 'px-1.5 py-0.5' : 'px-2.5 py-1'
      }`}
      style={{ background: TAG_GRADIENT }}
    >
      <span className={`${small ? 'text-[11px]' : 'text-sm'} font-extrabold leading-tight`}>{fmtPrice(price, currency)}</span>
      <span className={`${small ? 'text-[6px]' : 'text-[8px]'} font-bold uppercase tracking-wider leading-none opacity-90`}>{currency}</span>
    </span>
  );
}

/* ---------- Standard card (2 per row) — main reference template ---------- */
function GridCard({ item, theme, onTheme, isAr, currency, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="group relative w-full overflow-hidden rounded-xl bg-white text-start shadow-soft ring-1 ring-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.98]"
    >
      {/* Full-width banner — current language only */}
      <div className="flex items-center justify-center px-2 py-2" style={{ backgroundColor: theme, color: onTheme }}>
        <span
          className={`truncate font-extrabold leading-tight ${isAr ? 'font-arabic text-[13px]' : 'text-[11px] uppercase tracking-wide'}`}
        >
          {isAr ? item.nameAr || item.nameEn : item.nameEn || item.nameAr}
        </span>
      </div>

      {/* Product photo on white with the watermark pattern */}
      <div className="pattern-arabesque relative aspect-[4/3] bg-white">
        {item.imageUrl ? (
          <SmartImage
            src={item.imageUrl}
            alt={item.nameEn}
            className="h-full w-full"
            imgClassName="h-full w-full object-contain p-1.5 transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-200">
            <UtensilsCrossed size={30} />
          </div>
        )}
        {item.badgeText && <Ribbon text={item.badgeText} />}
        <PriceTag price={item.price} currency={currency} />
      </div>
    </button>
  );
}

/* ---------- Large card (full width) — like the fries page ---------- */
function LargeCard({ item, theme, onTheme, isAr, currency, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="group relative block w-full overflow-hidden rounded-xl bg-white text-start shadow-soft ring-1 ring-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.99]"
    >
      <div className="flex items-center justify-center px-3 py-2.5" style={{ backgroundColor: theme, color: onTheme }}>
        <span
          className={`truncate font-extrabold leading-tight ${isAr ? 'font-arabic text-[15px]' : 'text-sm uppercase tracking-wide'}`}
        >
          {isAr ? item.nameAr || item.nameEn : item.nameEn || item.nameAr}
        </span>
      </div>

      <div className="pattern-arabesque relative bg-white">
        {item.imageUrl ? (
          <SmartImage
            src={item.imageUrl}
            alt={item.nameEn}
            className="w-full"
            imgClassName="mx-auto aspect-[16/9] w-full object-contain p-2 transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex aspect-[16/9] items-center justify-center text-gray-200">
            <UtensilsCrossed size={40} />
          </div>
        )}
        {item.badgeText && <Ribbon text={item.badgeText} />}
        {/* Circular price badge, vertically centered on the end side — reference fries-page style */}
        <span
          className="absolute end-3 top-1/2 flex h-16 w-16 -translate-y-1/2 flex-col items-center justify-center rounded-full text-white shadow-lift ring-4 ring-white/80"
          style={{ background: TAG_GRADIENT }}
        >
          <span className="text-[15px] font-extrabold leading-tight">{fmtPrice(item.price, currency)}</span>
          <span className="text-[8px] font-bold uppercase tracking-wider leading-none opacity-90">{currency}</span>
        </span>
      </div>
    </button>
  );
}

/* ---------- Compact card (3 per row) — like the burger row ---------- */
function CompactCard({ item, theme, onTheme, isAr, currency, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="group relative w-full overflow-hidden rounded-xl bg-white text-start shadow-soft ring-1 ring-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.97]"
    >
      <div className="flex items-center justify-center px-1 py-1.5" style={{ backgroundColor: theme, color: onTheme }}>
        <span
          className={`w-full truncate text-center font-extrabold leading-tight ${isAr ? 'font-arabic text-[11px]' : 'text-[9px] uppercase tracking-wide'}`}
        >
          {isAr ? item.nameAr || item.nameEn : item.nameEn || item.nameAr}
        </span>
      </div>

      <div className="pattern-arabesque relative aspect-square bg-white">
        {item.imageUrl ? (
          <SmartImage
            src={item.imageUrl}
            alt={item.nameEn}
            className="h-full w-full"
            imgClassName="h-full w-full object-contain p-1 transition-transform duration-500 group-hover:scale-[1.05]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-200">
            <UtensilsCrossed size={22} />
          </div>
        )}
        {item.badgeText && <Ribbon text={item.badgeText} small />}
        <PriceTag price={item.price} currency={currency} small />
      </div>
    </button>
  );
}

/* ---------- List card (horizontal rows with description) ---------- */
function ListCard({ item, theme, onTheme, isAr, currency, onOpen }) {
  const desc = isAr ? item.descriptionAr || item.descriptionEn : item.descriptionEn || item.descriptionAr;
  return (
    <button
      onClick={onOpen}
      className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl bg-white p-2.5 text-start shadow-soft ring-1 ring-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.99]"
    >
      <div className="pattern-arabesque relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-black/5">
        {item.imageUrl ? (
          <SmartImage
            src={item.imageUrl}
            alt={item.nameEn}
            className="h-full w-full"
            imgClassName="h-full w-full object-contain p-1 transition-transform duration-500 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-200"><UtensilsCrossed size={22} /></div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <span
          className={`block truncate font-extrabold text-gray-900 ${isAr ? 'font-arabic text-[14px]' : 'text-[13px] uppercase tracking-wide'}`}
        >
          {isAr ? item.nameAr || item.nameEn : item.nameEn || item.nameAr}
        </span>
        {desc && <p className="mt-0.5 line-clamp-1 text-xs text-gray-400">{desc}</p>}
        {item.badgeText && (
          <span
            className="mt-1 inline-block rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-white"
            style={{ background: RIBBON_GRADIENT }}
          >
            {item.badgeText}
          </span>
        )}
      </div>

      <span className="flex shrink-0 flex-col items-center rounded-lg px-2.5 py-1 text-white shadow-md" style={{ background: TAG_GRADIENT }}>
        <span className="text-sm font-extrabold leading-tight">{fmtPrice(item.price, currency)}</span>
        <span className="text-[8px] font-bold uppercase tracking-wider leading-none opacity-90">{currency}</span>
      </span>
    </button>
  );
}

/* ---------- Featured hero card (full-bleed photo, overlay text) ---------- */
function HeroCard({ item, theme, onTheme, isAr, currency, onOpen }) {
  const desc = isAr ? item.descriptionAr || item.descriptionEn : item.descriptionEn || item.descriptionAr;
  return (
    <button
      onClick={onOpen}
      className="group relative block w-full overflow-hidden rounded-2xl bg-gray-900 text-start shadow-lift ring-1 ring-black/10 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.99]"
    >
      <div className="relative aspect-[16/10]">
        {item.imageUrl ? (
          <SmartImage
            src={item.imageUrl}
            alt={item.nameEn}
            className="h-full w-full"
            imgClassName="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
          />
        ) : (
          <div className="pattern-arabesque flex h-full items-center justify-center bg-white text-gray-200"><UtensilsCrossed size={40} /></div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
        {item.badgeText && <Ribbon text={item.badgeText} />}

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
          <div className="min-w-0">
            <span
              className={`block truncate font-extrabold text-white drop-shadow ${isAr ? 'font-arabic text-xl' : 'text-lg uppercase tracking-wide'}`}
            >
              {isAr ? item.nameAr || item.nameEn : item.nameEn || item.nameAr}
            </span>
            {desc && <p className="mt-0.5 line-clamp-1 text-xs text-white/75">{desc}</p>}
          </div>
          <span className="flex shrink-0 flex-col items-center rounded-xl px-3 py-1.5 text-white shadow-lift" style={{ background: TAG_GRADIENT }}>
            <span className="text-base font-extrabold leading-tight">{fmtPrice(item.price, currency)}</span>
            <span className="text-[8px] font-bold uppercase tracking-wider leading-none opacity-90">{currency}</span>
          </span>
        </div>
      </div>
    </button>
  );
}

/* ---------- Elegant card (no banner, centered text, theme accents) ---------- */
function MinimalCard({ item, theme, onTheme, isAr, currency, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="group relative w-full overflow-hidden rounded-xl bg-white pb-3.5 text-start shadow-soft ring-1 ring-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.98]"
    >
      <div className="pattern-arabesque relative aspect-[4/3] bg-white">
        {item.imageUrl ? (
          <SmartImage
            src={item.imageUrl}
            alt={item.nameEn}
            className="h-full w-full"
            imgClassName="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-200"><UtensilsCrossed size={30} /></div>
        )}
        {item.badgeText && <Ribbon text={item.badgeText} small />}
      </div>

      <div className="px-2 text-center">
        <div className="truncate text-[12px] font-bold uppercase tracking-wide text-gray-900">{item.nameEn}</div>
        <div className="font-arabic truncate text-[12px] font-bold text-gray-500">{item.nameAr}</div>
        <span className="mx-auto mt-1.5 block h-0.5 w-8 rounded-full" style={{ backgroundColor: theme }} />
        <div className="mt-1.5 text-sm font-extrabold" style={{ color: theme }}>
          {fmtPrice(item.price, currency)} <span className="text-[9px] font-bold uppercase text-gray-400">{currency}</span>
        </div>
      </div>
    </button>
  );
}

function MenuSkeleton() {
  return (
    <div className="pattern-arabesque min-h-screen animate-pulse" style={{ backgroundColor: '#FAF8F5' }}>
      <div className="flex flex-col items-center pb-8 pt-10">
        <div className="h-24 w-24 rounded-full bg-gray-200" />
        <div className="mt-4 h-6 w-44 rounded-full bg-gray-200" />
        <div className="mt-2 h-4 w-32 rounded-full bg-gray-200" />
      </div>
      <div className="mx-auto flex max-w-2xl gap-2 px-4 py-3">
        {[80, 96, 72, 88].map((w, i) => (
          <div key={i} className="h-9 rounded-full bg-gray-200" style={{ width: w }} />
        ))}
      </div>
      <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3 px-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl bg-white shadow-soft">
            <div className="h-9 bg-gray-200" />
            <div className="aspect-[4/3] bg-gray-50" />
          </div>
        ))}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <div className="rounded-3xl bg-white p-4 text-gray-300 shadow-soft"><SearchX size={40} /></div>
      <h1 className="mt-5 text-xl font-extrabold text-gray-900">Menu not found</h1>
      <p className="mt-1.5 max-w-xs text-sm text-gray-500">
        This menu link doesn't exist or the branch is currently inactive.
        <span className="font-arabic mt-1 block" dir="rtl">هذه القائمة غير موجودة أو الفرع غير نشط حالياً.</span>
      </p>
    </div>
  );
}
