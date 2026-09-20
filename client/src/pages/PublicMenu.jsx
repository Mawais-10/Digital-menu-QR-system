import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Search, X, LayoutGrid, Heart, Info, MapPin, Phone, Navigation, UtensilsCrossed, Plus, Minus, SearchX, ShoppingBag, Trash2,
} from 'lucide-react';
import { publicApi } from '../api/endpoints.js';
import { SmartImage } from '../components/motion.jsx';

const fmtPrice = (n, currency = 'OMR') => Number(n).toFixed(currency === 'OMR' ? 3 : 2);

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

function rgba(hex, a) {
  try {
    const c = hex.replace('#', '');
    const full = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  } catch {
    return `rgba(249, 115, 22, ${a})`;
  }
}

export default function PublicMenu() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound
  const [lang, setLang] = useState('en');
  const [screen, setScreen] = useState('welcome'); // welcome | menu
  const [tab, setTab] = useState('menu'); // menu | favorites
  const [infoOpen, setInfoOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailQty, setDetailQty] = useState(1);
  const [favorites, setFavorites] = useState([]);
  const [order, setOrder] = useState([]); // [{ id, qty }]
  const [orderOpen, setOrderOpen] = useState(false);
  const sectionRefs = useRef({});
  const tabRefs = useRef({});
  const clickScrolling = useRef(false);

  useEffect(() => {
    publicApi
      .menu(slug)
      .then(({ data }) => {
        setData(data);
        const saved = localStorage.getItem(`qm_lang_${slug}`);
        setLang(saved === 'ar' || saved === 'en' ? saved : data.restaurant.defaultLanguage);
        setActiveCat(data.categories[0]?.id || null);
        try {
          setFavorites(JSON.parse(localStorage.getItem(`qm_fav_${slug}`) || '[]'));
        } catch {
          setFavorites([]);
        }
        try {
          setOrder(JSON.parse(localStorage.getItem(`qm_order_${slug}`) || '[]'));
        } catch {
          setOrder([]);
        }
        setStatus('ready');
        document.title = `${data.restaurant.nameEn} — Menu`;
      })
      .catch(() => setStatus('notfound'));
  }, [slug]);

  const switchLang = (l) => {
    setLang(l);
    localStorage.setItem(`qm_lang_${slug}`, l);
  };

  const toggleFavorite = useCallback(
    (id) => {
      setFavorites((prev) => {
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
        localStorage.setItem(`qm_fav_${slug}`, JSON.stringify(next));
        return next;
      });
    },
    [slug]
  );

  const setOrderPersist = useCallback(
    (updater) => {
      setOrder((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        localStorage.setItem(`qm_order_${slug}`, JSON.stringify(next));
        return next;
      });
    },
    [slug]
  );

  const addToOrder = useCallback(
    (id, qty = 1) => {
      setOrderPersist((prev) => {
        const existing = prev.find((r) => r.id === id);
        if (existing) return prev.map((r) => (r.id === id ? { ...r, qty: r.qty + qty } : r));
        return [...prev, { id, qty }];
      });
    },
    [setOrderPersist]
  );

  const setOrderQty = useCallback(
    (id, qty) => {
      setOrderPersist((prev) => (qty <= 0 ? prev.filter((r) => r.id !== id) : prev.map((r) => (r.id === id ? { ...r, qty } : r))));
    },
    [setOrderPersist]
  );

  // Reset the modal quantity whenever a new product opens
  useEffect(() => {
    if (detail) setDetailQty(1);
  }, [detail]);

  const isAr = lang === 'ar';
  const theme = data?.restaurant.themeColor || '#F97316';
  const onTheme = readableOn(theme);
  const name = useCallback(
    (obj, en, ar) => (isAr ? obj[ar] || obj[en] : obj[en] || obj[ar]),
    [isAr]
  );

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

  const searchResults = useMemo(() => {
    if (!data || !search.trim()) return null;
    const q = search.trim().toLowerCase();
    return data.items.filter(
      (i) =>
        i.nameEn?.toLowerCase().includes(q) ||
        i.nameAr?.includes(search.trim()) ||
        i.descriptionEn?.toLowerCase().includes(q) ||
        i.descriptionAr?.includes(search.trim())
    );
  }, [data, search]);

  const favoriteItems = useMemo(
    () => (data ? data.items.filter((i) => favorites.includes(i.id)) : []),
    [data, favorites]
  );

  const orderRows = useMemo(() => {
    if (!data) return [];
    return order
      .map((r) => {
        const item = data.items.find((i) => i.id === r.id);
        return item ? { item, qty: r.qty } : null;
      })
      .filter(Boolean);
  }, [data, order]);
  const orderCount = orderRows.reduce((sum, r) => sum + r.qty, 0);
  const orderTotal = orderRows.reduce((sum, r) => sum + r.item.price * r.qty, 0);

  // Scrollspy — highlight the category tab currently in view
  useEffect(() => {
    if (status !== 'ready' || !data || screen !== 'menu' || tab !== 'menu' || search) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (clickScrolling.current) return;
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
          setActiveCat(top.target.dataset.cat);
        }
      },
      { rootMargin: '-130px 0px -55% 0px' }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [status, data, lang, screen, tab, search]);

  useEffect(() => {
    tabRefs.current[activeCat]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeCat]);

  const scrollToCat = (id) => {
    setSearch('');
    setTab('menu');
    setActiveCat(id);
    setDrawerOpen(false);
    clickScrolling.current = true;
    requestAnimationFrame(() => {
      sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => (clickScrolling.current = false), 700);
    });
  };

  if (status === 'loading') return <MenuSkeleton />;
  if (status === 'notfound') return <NotFound />;

  const { restaurant, branch, categories } = data;
  const primary10 = rgba(theme, 0.08);
  const primary20 = rgba(theme, 0.18);

  /* ================= WELCOME SCREEN ================= */
  if (screen === 'welcome') {
    return (
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        className={`relative flex min-h-screen min-h-dvh flex-col justify-end ${isAr ? 'font-arabic' : ''}`}
        style={{ background: `linear-gradient(180deg, ${theme} 0%, ${rgba(theme, 0.85)} 60%, ${rgba('#000000', 0.9)} 160%)` }}
      >
        <div className="pattern-arabesque absolute inset-0 opacity-30" />

        {/* Brand block, centered */}
        <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-8 text-center" style={{ color: onTheme }}>
          {restaurant.logoUrl ? (
            <SmartImage
              src={restaurant.logoUrl}
              alt={restaurant.nameEn}
              eager
              className="w-fit overflow-hidden rounded-2xl"
              imgClassName="h-32 w-auto max-w-[320px] object-contain drop-shadow-xl"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-white/15 text-6xl font-extrabold backdrop-blur">
              {restaurant.nameEn[0]}
            </div>
          )}
          <h1 className="mt-6 break-words font-sans text-3xl font-bold tracking-tight">{name(restaurant, 'nameEn', 'nameAr')}</h1>
          {(restaurant.taglineEn || restaurant.taglineAr) && (
            <p className="mt-2 max-w-xs text-sm font-medium opacity-85">{name(restaurant, 'taglineEn', 'taglineAr')}</p>
          )}
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-black/15 px-4 py-1.5 text-xs font-semibold backdrop-blur">
            <MapPin size={12} />
            {name(branch, 'nameEn', 'nameAr')}
          </span>
        </div>

        {/* Language circles + view menu */}
        <div
          className="relative mx-auto w-full max-w-md px-5"
          style={{ color: onTheme, paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
        >
          <div className="mb-4 flex items-center justify-center gap-3">
            {[
              { v: 'en', label: 'EN' },
              { v: 'ar', label: 'ع' },
            ].map(({ v, label }) => (
              <button
                key={v}
                onClick={() => switchLang(v)}
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all ${v === 'ar' ? 'font-arabic' : ''}`}
                style={
                  lang === v
                    ? { backgroundColor: '#fff', color: theme }
                    : { backgroundColor: 'rgba(255,255,255,0.12)', color: onTheme }
                }
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setScreen('menu')}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-white text-base font-semibold shadow-lift transition-transform active:scale-[0.98]"
            style={{ color: theme }}
          >
            {isAr ? 'عرض القائمة' : 'View Menu'}
          </button>
        </div>
      </div>
    );
  }

  /* ================= MENU SCREEN ================= */
  const showSections = tab === 'menu' && !search;
  const gridItems = search ? searchResults : tab === 'favorites' ? favoriteItems : null;

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className={`min-h-screen bg-white pb-24 text-gray-800 ${isAr ? 'font-arabic' : ''}`}>
      {/* Top row: language pill */}
      <div className="flex h-12 items-center justify-between px-4 pt-2">
        <button
          onClick={() => setScreen('welcome')}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-50"
          title={restaurant.nameEn}
        >
          {restaurant.logoUrl ? (
            <img src={restaurant.logoUrl} alt="" className="h-7 w-auto max-w-[60px] rounded object-contain" />
          ) : (
            <span className="text-sm font-bold" style={{ color: theme }}>{restaurant.nameEn[0]}</span>
          )}
        </button>
        <button
          onClick={() => switchLang(isAr ? 'en' : 'ar')}
          className="flex h-8 items-center gap-1.5 rounded-full border border-gray-300 px-3 text-xs font-semibold text-gray-700 transition-colors active:bg-gray-50"
        >
          {isAr ? 'English' : <span className="font-arabic">عربي</span>}
        </button>
      </div>

      {/* Cover banner — blurred fill + sharp logo, like the reference */}
      <div className="mx-4 mt-1">
        <div className="relative h-36 w-full overflow-hidden rounded-xl" style={{ backgroundColor: primary10 }}>
          {restaurant.logoUrl && (
            <div
              className="absolute inset-0 scale-125 bg-center bg-no-repeat opacity-60 blur-2xl"
              style={{ backgroundImage: `url(${restaurant.logoUrl})`, backgroundSize: '55%' }}
            />
          )}
          <div className="pattern-arabesque absolute inset-0 opacity-40" />
          <div className="relative z-20 flex h-full items-center justify-center">
            {restaurant.logoUrl ? (
              <img src={restaurant.logoUrl} alt={restaurant.nameEn} className="h-24 w-auto max-w-[70%] object-contain drop-shadow" />
            ) : (
              <UtensilsCrossed size={40} style={{ color: theme }} />
            )}
          </div>
        </div>
      </div>

      {/* Restaurant name + description */}
      <div className="mt-5 px-4 text-center">
        <h1 className="break-words font-sans text-xl font-semibold text-gray-900">{name(restaurant, 'nameEn', 'nameAr')}</h1>
        {(restaurant.taglineEn || restaurant.taglineAr) && (
          <p className="mt-1 break-words text-sm text-gray-500">{name(restaurant, 'taglineEn', 'taglineAr')}</p>
        )}
      </div>

      {/* Sticky: search + category tabs */}
      <div className="sticky top-0 z-30 mt-4 bg-white">
        <div className="px-4 pt-2">
          <div className="relative h-10 overflow-hidden rounded-full">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAr ? 'ابحث في القائمة...' : 'Search the menu...'}
              className="block h-full w-full rounded-full border-none pe-9 ps-10 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0"
              style={{ backgroundColor: primary10 }}
            />
            <span className="absolute bottom-0 start-0 top-0 flex h-10 w-10 items-center justify-center">
              <Search size={17} style={{ color: theme }} />
            </span>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute bottom-0 end-0 top-0 flex h-10 w-9 items-center justify-center text-gray-400"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="relative mt-2">
          <div className="flex h-12 items-center">
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex h-full w-12 flex-shrink-0 items-center justify-center focus:outline-none"
              title="All categories"
            >
              <LayoutGrid size={19} style={{ color: theme }} />
            </button>
            <div className="no-scrollbar relative flex h-full flex-1 items-center overflow-x-auto pe-4">
              {categories.map((c) => {
                const active = activeCat === c.id && showSections;
                return (
                  <button
                    key={c.id}
                    ref={(el) => (tabRefs.current[c.id] = el)}
                    onClick={() => scrollToCat(c.id)}
                    className="relative me-2 touch-manipulation whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition"
                    style={
                      active
                        ? { backgroundColor: theme, color: onTheme }
                        : { backgroundColor: 'rgba(0,0,0,0.03)', color: '#374151' }
                    }
                  >
                    {name(c, 'nameEn', 'nameAr')}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 border-t border-gray-900/5" />
        </div>
      </div>

      {/* ===== Content ===== */}
      {showSections ? (
        categories.map((c) => {
          const catItems = itemsByCat.get(c.id) || [];
          return (
            <section
              key={c.id}
              data-cat={c.id}
              ref={(el) => (sectionRefs.current[c.id] = el)}
              className="cv-auto scroll-mt-32 px-4 pt-5"
            >
              {/* Category banner: soft gradient block with a name chip, exactly like the reference */}
              <div
                className="relative mb-3 flex h-20 shrink-0 flex-col items-start justify-end overflow-hidden rounded-md font-medium"
                style={{ background: `linear-gradient(to top, ${primary20}, ${primary10})` }}
              >
                <span className="z-10 mx-2 mb-2 mt-2 block rounded bg-white px-2.5 py-1 font-sans text-sm font-semibold text-gray-800 shadow-sm">
                  {name(c, 'nameEn', 'nameAr')}
                </span>
              </div>

              <div className="-mx-1.5 flex flex-wrap">
                {catItems.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    theme={theme}
                    onTheme={onTheme}
                    primary10={primary10}
                    isAr={isAr}
                    currency={restaurant.currency}
                    fav={favorites.includes(item.id)}
                    onFav={() => toggleFavorite(item.id)}
                    onOpen={() => setDetail(item)}
                    onAdd={() => addToOrder(item.id, 1)}
                  />
                ))}
              </div>
            </section>
          );
        })
      ) : (
        /* Search results or favorites */
        <div className="px-4 pt-5">
          <p className="mb-3 text-sm font-medium text-gray-500">
            {search
              ? isAr
                ? `${gridItems.length} نتيجة`
                : `${gridItems.length} result${gridItems.length === 1 ? '' : 's'}`
              : isAr
                ? 'المفضلة'
                : 'Favorites'}
          </p>
          {gridItems.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center text-gray-300">
              {search ? <SearchX size={36} /> : <Heart size={36} />}
              <p className="mt-3 text-sm font-medium text-gray-400">
                {search ? (isAr ? 'لا توجد نتائج' : 'Nothing found') : isAr ? 'لا توجد عناصر مفضلة بعد' : 'No favorites yet'}
              </p>
            </div>
          ) : (
            <div className="-mx-1.5 flex flex-wrap">
              {gridItems.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  theme={theme}
                  onTheme={onTheme}
                  primary10={primary10}
                  isAr={isAr}
                  currency={restaurant.currency}
                  fav={favorites.includes(item.id)}
                  onFav={() => toggleFavorite(item.id)}
                  onOpen={() => setDetail(item)}
                  onAdd={() => addToOrder(item.id, 1)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mx-auto mt-10 max-w-xs pb-4 text-center text-sm text-gray-400">
        Powered by <span className="font-semibold text-gray-500">Simat</span>
      </div>

      {/* ===== Bottom tab bar ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center">
        <div
          className="flex w-full max-w-md rounded-t-xl border-l border-r border-t border-gray-900/5 bg-white/90 backdrop-blur"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {[
            { id: 'menu', icon: UtensilsCrossed, label: isAr ? 'القائمة' : 'Menu', onClick: () => { setTab('menu'); setSearch(''); window.scrollTo({ top: 0 }); } },
            { id: 'favorites', icon: Heart, label: isAr ? 'المفضلة' : 'Favorites', onClick: () => { setTab('favorites'); setSearch(''); window.scrollTo({ top: 0 }); }, count: favorites.length },
            { id: 'order', icon: ShoppingBag, label: isAr ? 'الطلب' : 'Order', onClick: () => setOrderOpen(true), count: orderCount },
            { id: 'info', icon: Info, label: isAr ? 'معلومات' : 'Info', onClick: () => setInfoOpen(true) },
          ].map(({ id, icon: Icon, label, onClick, count }) => {
            const active =
              id === 'info' ? infoOpen : id === 'order' ? orderOpen : tab === id && !infoOpen && !orderOpen;
            return (
              <button key={id} onClick={onClick} className="flex min-w-[4rem] flex-1 cursor-pointer flex-col items-center py-2 transition">
                <span className="relative">
                  <Icon size={21} style={{ color: active ? theme : '#9CA3AF' }} fill={id === 'favorites' && count > 0 ? theme : 'none'} strokeWidth={id === 'favorites' && count > 0 ? 0 : 2} />
                  {count > 0 && id !== 'menu' && (
                    <span
                      className="absolute -end-2 -top-1.5 flex min-h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                      style={{ backgroundColor: theme, color: onTheme }}
                    >
                      {count}
                    </span>
                  )}
                </span>
                <span className="mt-1 text-center text-xs font-medium" style={{ color: active ? theme : '#9CA3AF' }}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ===== Category drawer ===== */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60]">
          <div className="animate-backdrop absolute inset-0 bg-white/50 backdrop-blur" onClick={() => setDrawerOpen(false)} />
          <aside className="animate-fade-in absolute top-0 flex h-screen w-64 max-w-[calc(100vw-100px)] flex-col bg-white shadow-xl start-0">
            <div className="flex items-center justify-between px-4 py-4">
              <span className="font-sans text-base font-semibold text-gray-900">{isAr ? 'الفئات' : 'Categories'}</span>
              <button onClick={() => setDrawerOpen(false)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-50">
                <X size={17} />
              </button>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto px-3 pb-10">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => scrollToCat(c.id)}
                  className="flex items-center justify-between rounded-lg px-3 py-3 text-start text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {name(c, 'nameEn', 'nameAr')}
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
                    style={{ backgroundColor: primary10, color: theme }}
                  >
                    {(itemsByCat.get(c.id) || []).length}
                  </span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}

      {/* ===== Info sheet ===== */}
      {infoOpen && (
        <div className="fixed inset-0 z-[60]" onClick={() => setInfoOpen(false)}>
          <div className="animate-backdrop absolute inset-0 bg-white/50 backdrop-blur" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-sheet-up absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-xl border-l border-r border-t border-gray-900/5 bg-white p-5 pb-8 shadow-lift"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-sans text-lg font-semibold text-gray-900">{name(branch, 'nameEn', 'nameAr')}</h3>
              <button onClick={() => setInfoOpen(false)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-50">
                <X size={17} />
              </button>
            </div>
            <div className="space-y-2.5">
              {branch.address && (
                <div className="flex items-start gap-3 rounded-xl px-3.5 py-3" style={{ backgroundColor: primary10 }}>
                  <MapPin size={17} className="mt-0.5 shrink-0" style={{ color: theme }} />
                  <span className="text-sm text-gray-700">{branch.address}</span>
                </div>
              )}
              {branch.mapLink && (
                <a
                  href={branch.mapLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-transform active:scale-[0.98]"
                  style={{ backgroundColor: theme, color: onTheme }}
                >
                  <Navigation size={15} /> {isAr ? 'الاتجاهات' : 'Get Directions'}
                </a>
              )}
              {branch.phone && (
                <a
                  href={`tel:${branch.phone}`}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 transition-colors active:bg-gray-50"
                >
                  <Phone size={15} /> {branch.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Product detail modal — floating card with sticky action bar, reference style ===== */}
      {detail && (
        <div
          className="fixed left-0 right-0 top-0 z-[70] h-screen transform overflow-y-scroll bg-white/50 backdrop-blur"
          onClick={() => setDetail(null)}
        >
          <div className="mx-auto flex h-full min-h-screen w-full flex-col items-center justify-center px-4 py-6">
            <div
              onClick={(e) => e.stopPropagation()}
              className="animate-pop relative w-[550px] max-w-full shrink-0 rounded-xl bg-white shadow-lg"
            >
              <div className="relative flex w-full shrink-0 items-center overflow-hidden rounded-t-xl">
                {detail.imageUrl ? (
                  <SmartImage src={detail.imageUrl} alt="" eager className="w-full" imgClassName="aspect-[4/3] w-full rounded-t-xl object-cover" />
                ) : (
                  <div className="flex aspect-[16/9] w-full items-center justify-center rounded-t-xl" style={{ backgroundColor: primary10 }}>
                    <UtensilsCrossed size={40} style={{ color: theme }} />
                  </div>
                )}
                {detail.badgeText && (
                  <span
                    className="absolute start-4 top-4 rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm"
                    style={{ backgroundColor: theme, color: onTheme }}
                  >
                    {detail.badgeText}
                  </span>
                )}
              </div>
              <button
                onClick={() => setDetail(null)}
                className="absolute end-5 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm backdrop-blur"
              >
                <X size={17} />
              </button>

              <div className="px-4 pt-4">
                <div className="flex min-w-0 items-center">
                  <h3 className="min-w-0 flex-1 break-words font-sans text-xl font-semibold text-gray-900">
                    {isAr ? detail.nameAr || detail.nameEn : detail.nameEn || detail.nameAr}
                  </h3>
                  <div className="flex shrink-0 ps-6">
                    <button
                      onClick={() => toggleFavorite(detail.id)}
                      className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
                      style={
                        favorites.includes(detail.id)
                          ? { backgroundColor: theme, color: onTheme }
                          : { backgroundColor: primary10, color: theme }
                      }
                    >
                      <Heart size={18} fill={favorites.includes(detail.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>
                {(detail.descriptionEn || detail.descriptionAr) && (
                  <p className="mt-1 whitespace-pre-line text-sm italic text-gray-500">
                    {isAr ? detail.descriptionAr || detail.descriptionEn : detail.descriptionEn || detail.descriptionAr}
                  </p>
                )}
                <div className="mb-2 mt-4 flex flex-wrap items-center justify-between">
                  <span className="me-4 text-lg font-semibold text-gray-900">
                    {fmtPrice(detail.price, restaurant.currency)}{' '}
                    <span className="text-xs font-medium text-gray-400">{restaurant.currency}</span>
                  </span>
                </div>
              </div>

              {/* Sticky action bar: quantity stepper + add to order */}
              <div className="sticky bottom-0 z-40 mt-4 flex items-center rounded-b-xl bg-white px-4 pb-4 pt-4">
                <div className="flex h-12 w-[7rem] shrink-0 items-center rounded-full border" style={{ borderColor: rgba(theme, 0.5) }}>
                  <button onClick={() => setDetailQty((q) => Math.max(1, q - 1))} className="flex h-full flex-1 items-center justify-center" style={{ color: theme }}>
                    <Minus size={16} />
                  </button>
                  <span className="min-w-[25px] px-1 text-center text-sm font-semibold text-gray-900">{detailQty}</span>
                  <button onClick={() => setDetailQty((q) => q + 1)} className="flex h-full flex-1 items-center justify-center" style={{ color: theme }}>
                    <Plus size={16} />
                  </button>
                </div>
                <button
                  onClick={() => {
                    addToOrder(detail.id, detailQty);
                    setDetail(null);
                  }}
                  className="ms-3 flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold transition-transform active:scale-[0.98] md:text-base"
                  style={{ backgroundColor: theme, color: onTheme }}
                >
                  {isAr ? 'أضف إلى الطلب' : 'Add to order'} · {fmtPrice(detail.price * detailQty, restaurant.currency)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Order sheet ===== */}
      {orderOpen && (
        <div className="fixed inset-0 z-[65]" onClick={() => setOrderOpen(false)}>
          <div className="animate-backdrop absolute inset-0 bg-white/50 backdrop-blur" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-sheet-up absolute inset-x-0 bottom-0 mx-auto flex max-h-[85vh] max-w-md flex-col rounded-t-xl border-l border-r border-t border-gray-900/5 bg-white shadow-lift"
          >
            <div className="flex items-center justify-between p-4 pb-2">
              <h3 className="font-sans text-lg font-semibold text-gray-900">{isAr ? 'طلبك' : 'Your order'}</h3>
              <button onClick={() => setOrderOpen(false)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-50">
                <X size={17} />
              </button>
            </div>

            {orderRows.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-14 text-center text-gray-300">
                <ShoppingBag size={36} />
                <p className="mt-3 text-sm font-medium text-gray-400">
                  {isAr ? 'لم تقم بإضافة أي عناصر بعد' : 'You have not added anything yet'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-4">
                  {orderRows.map(({ item, qty }) => (
                    <div key={item.id} className="flex items-center border-b border-gray-900/5 py-3 last:border-b-0">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md" style={{ backgroundColor: primary10 }}>
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="absolute inset-0 h-full w-full rounded-md object-cover object-center" />
                        ) : (
                          <span className="flex h-full items-center justify-center" style={{ color: theme }}><UtensilsCrossed size={20} /></span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 px-3">
                        <div className="truncate text-sm font-semibold text-gray-900">
                          {isAr ? item.nameAr || item.nameEn : item.nameEn || item.nameAr}
                        </div>
                        <div className="mt-0.5 text-sm font-medium text-gray-500">
                          {fmtPrice(item.price * qty, restaurant.currency)} <span className="text-[11px] text-gray-400">{restaurant.currency}</span>
                        </div>
                      </div>
                      <div className="flex h-9 w-[5.5rem] shrink-0 items-center rounded-full border" style={{ borderColor: rgba(theme, 0.5) }}>
                        <button onClick={() => setOrderQty(item.id, qty - 1)} className="flex h-full flex-1 items-center justify-center" style={{ color: theme }}>
                          <Minus size={13} />
                        </button>
                        <span className="min-w-[20px] text-center text-xs font-semibold text-gray-900">{qty}</span>
                        <button onClick={() => setOrderQty(item.id, qty + 1)} className="flex h-full flex-1 items-center justify-center" style={{ color: theme }}>
                          <Plus size={13} />
                        </button>
                      </div>
                      <button
                        onClick={() => setOrderQty(item.id, 0)}
                        className="ms-3 rounded p-1 text-gray-300 transition hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-900/10 p-4 pb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-gray-900">{isAr ? 'المجموع' : 'Total'}</span>
                    <span className="text-lg font-semibold" style={{ color: theme }}>
                      {fmtPrice(orderTotal, restaurant.currency)} <span className="text-xs font-medium text-gray-400">{restaurant.currency}</span>
                    </span>
                  </div>
                  <p className="mt-2 text-center text-xs text-gray-400">
                    {isAr ? 'أظهر هذه القائمة للنادل لإتمام طلبك' : 'Show this list to your waiter to place the order'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Product card: image with overlapping + button, flat body — reference style ---------- */
function ProductCard({ item, theme, onTheme, primary10, isAr, currency, fav, onFav, onOpen, onAdd }) {
  return (
    <div className="w-1/2 px-1.5 pb-5 md:w-1/3 lg:w-1/4 xl:w-1/5">
      <button onClick={onOpen} className="relative block w-full text-start">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg" style={{ backgroundColor: primary10 }}>
          {item.imageUrl ? (
            <SmartImage
              src={item.imageUrl}
              alt={item.nameEn}
              className="h-full w-full"
              imgClassName="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center" style={{ color: theme }}>
              <UtensilsCrossed size={28} />
            </div>
          )}
          {item.badgeText && (
            <span
              className="absolute start-1.5 top-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold shadow-sm"
              style={{ backgroundColor: theme, color: onTheme }}
            >
              {item.badgeText}
            </span>
          )}
          {/* Favorite toggle on the photo */}
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              onFav();
            }}
            className="absolute end-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-transform active:scale-90"
            style={{ color: fav ? theme : '#9CA3AF' }}
          >
            <Heart size={15} fill={fav ? 'currentColor' : 'none'} />
          </span>
          {/* Overlapping circular + button — quick add to order */}
          <span className="absolute bottom-0.5 end-0.5 flex justify-end">
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onAdd();
              }}
              className="z-10 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white transition-transform active:scale-90"
              style={{ backgroundColor: theme, color: onTheme }}
            >
              <Plus size={18} />
            </span>
          </span>
        </div>

        <div className="relative flex min-w-0 flex-col pt-2">
          <span className="max-w-full break-words text-[15px] font-semibold leading-snug text-gray-900">
            {isAr ? item.nameAr || item.nameEn : item.nameEn || item.nameAr}
          </span>
          {(item.descriptionEn || item.descriptionAr) && (
            <span className="mt-0.5 line-clamp-2 whitespace-pre-line break-words text-sm text-gray-500">
              {isAr ? item.descriptionAr || item.descriptionEn : item.descriptionEn || item.descriptionAr}
            </span>
          )}
          <span className="mt-1.5 flex shrink-0 items-center justify-between">
            <span className="flex flex-wrap items-baseline text-sm">
              <span className="whitespace-nowrap font-semibold text-gray-900">
                {fmtPrice(item.price, currency)} <span className="text-[11px] font-medium text-gray-400">{currency}</span>
              </span>
            </span>
          </span>
        </div>
      </button>
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className="min-h-screen animate-pulse bg-white">
      <div className="flex justify-end px-4 pt-4">
        <div className="h-8 w-20 rounded-full bg-gray-100" />
      </div>
      <div className="mx-4 mt-2 h-36 rounded-xl bg-gray-100" />
      <div className="mx-auto mt-5 h-5 w-44 rounded-full bg-gray-100" />
      <div className="mx-auto mt-2 h-3.5 w-32 rounded-full bg-gray-100" />
      <div className="mx-4 mt-5 h-10 rounded-full bg-gray-100" />
      <div className="mt-3 flex gap-2 px-4">
        {[72, 88, 64, 80].map((w, i) => (
          <div key={i} className="h-8 rounded-lg bg-gray-100" style={{ width: w }} />
        ))}
      </div>
      <div className="mx-4 mt-5 h-20 rounded-md bg-gray-100" />
      <div className="mt-3 flex flex-wrap px-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-1/2 px-1.5 pb-5">
            <div className="aspect-square rounded-lg bg-gray-100" />
            <div className="mt-2 h-4 w-3/4 rounded bg-gray-100" />
            <div className="mt-1.5 h-3 w-1/2 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <div className="rounded-3xl bg-gray-50 p-4 text-gray-300"><SearchX size={40} /></div>
      <h1 className="mt-5 text-xl font-semibold text-gray-900">Menu not found</h1>
      <p className="mt-1.5 max-w-xs text-sm text-gray-500">
        This menu link doesn't exist or the branch is currently inactive.
        <span className="font-arabic mt-1 block" dir="rtl">هذه القائمة غير موجودة أو الفرع غير نشط حالياً.</span>
      </p>
    </div>
  );
}
