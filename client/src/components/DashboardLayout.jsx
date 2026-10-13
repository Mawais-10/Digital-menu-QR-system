import { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import {
  LayoutDashboard, UtensilsCrossed, Store, QrCode, Palette, Settings, LogOut, Menu as MenuIcon, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { LogoMark, IconButton, PageSkeleton, EASE, cx } from './ui.jsx';

const NAV = [
  { items: [{ to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true }] },
  { title: 'Menu', items: [{ to: '/dashboard/menu', label: 'Master Menu', icon: UtensilsCrossed }] },
  {
    title: 'Locations',
    items: [
      { to: '/dashboard/branches', label: 'Branches', icon: Store },
      { to: '/dashboard/qr', label: 'QR Codes', icon: QrCode },
    ],
  },
  {
    title: 'Brand',
    items: [
      { to: '/dashboard/branding', label: 'Branding', icon: Palette },
      { to: '/dashboard/settings', label: 'Settings', icon: Settings },
    ],
  },
];

function NavItems({ onNavigate, indicatorId }) {
  return (
    <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-4">
      {NAV.map((group, gi) => (
        <div key={gi} className={gi ? 'mt-5' : ''}>
          {group.title && (
            <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-200/55">{group.title}</div>
          )}
          <ul className="space-y-0.5">
            {group.items.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cx(
                      'relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150',
                      isActive ? 'font-semibold text-brand-950' : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId={indicatorId}
                          aria-hidden="true"
                          className="absolute inset-0 rounded-lg bg-brand-300 shadow-[0_6px_18px_-8px_rgba(190,223,166,0.55)]"
                          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                        />
                      )}
                      <Icon size={18} aria-hidden="true" className={cx('relative', isActive ? 'text-brand-900' : 'text-white/45')} />
                      <span className="relative">{label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function AccountFooter({ onSignOut }) {
  const { user, restaurant } = useAuth();
  const name = restaurant?.nameEn || user?.businessName || 'Your brand';
  return (
    <div className="border-t border-white/10 p-3">
      <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-2.5 py-2.5 ring-1 ring-inset ring-white/[0.06]">
        {restaurant?.logoUrl ? (
          <img src={restaurant.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-0.5" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-300 text-sm font-semibold text-brand-950" aria-hidden="true">
            {name[0]?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">{name}</div>
          <div className="truncate text-xs text-white/55">{user?.email}</div>
        </div>
        <IconButton label="Sign out" onClick={onSignOut} size="sm" className="!text-white/60 hover:!bg-white/10 hover:!text-white">
          <LogOut size={16} />
        </IconButton>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 pb-5 pt-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-[0_4px_14px_-4px_rgba(0,0,0,0.4)]">
        <LogoMark size={34} />
      </span>
      <div className="leading-tight">
        <div className="text-[15px] font-bold tracking-[0.08em] text-white">DINEZA</div>
        <div className="text-[11px] font-medium text-brand-200/70">Brand manager</div>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef(null);
  const menuButtonRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // New page: close the drawer and start at the top
  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  // Drawer: Escape closes, focus moves in and back out
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMobileOpen(false);
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => drawerRef.current?.querySelector('a, button')?.focus(), 50);
    const menuButton = menuButtonRef.current;
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      menuButton?.focus();
    };
  }, [mobileOpen]);

  return (
    // reducedMotion="user": every animation in the dashboard follows the OS "reduce motion" setting
    <MotionConfig reducedMotion="user">
    <div className="dash min-h-screen">
      <a
        href="#main"
        className="sr-only z-[60] rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-pop focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-brand-950 lg:flex">
        <Brand />
        <NavItems indicatorId="nav-indicator-desktop" />
        <AccountFooter onSignOut={handleLogout} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white/95 px-3 backdrop-blur lg:hidden">
        <IconButton
          ref={menuButtonRef}
          label="Open menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          onClick={() => setMobileOpen(true)}
        >
          <MenuIcon size={20} />
        </IconButton>
        <div className="flex items-center gap-2">
          <LogoMark size={32} />
          <span className="text-sm font-bold tracking-tight text-gray-900">DINEZA</span>
        </div>
        <div className="w-9" aria-hidden="true" />
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-gray-950/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              id="mobile-nav"
              ref={drawerRef}
              aria-label="Navigation"
              className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-brand-950 shadow-pop"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.26, ease: EASE }}
            >
              <div className="flex items-center justify-between pe-3">
                <Brand />
                <IconButton label="Close menu" onClick={() => setMobileOpen(false)} className="!text-white/70 hover:!bg-white/10 hover:!text-white">
                  <X size={18} />
                </IconButton>
              </div>
              <NavItems indicatorId="nav-indicator-mobile" onNavigate={() => setMobileOpen(false)} />
              <AccountFooter onSignOut={handleLogout} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <main id="main" tabIndex={-1} className="outline-none lg:pl-[248px]">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* Enter-only transition: no exit phase, so pages never flash blank between routes */}
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </div>
      </main>
    </div>
    </MotionConfig>
  );
}
