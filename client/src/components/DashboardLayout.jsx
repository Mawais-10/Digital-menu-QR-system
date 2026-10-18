import { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import {
  LayoutDashboard, UtensilsCrossed, Store, QrCode, Palette, Settings, LogOut, Menu as MenuIcon, X, PanelLeftClose, PanelLeftOpen,
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

// Collapsed rail: everything stays where it is and the sidebar narrows over it, so only
// fades are needed. Icons sit at the rail's centre in both states and never move.
const fade = (hidden) => cx('transition-opacity duration-200', hidden && 'pointer-events-none opacity-0');

function NavItems({ onNavigate, indicatorId, collapsed = false }) {
  return (
    <nav aria-label="Main" className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
      {NAV.map((group, gi) => (
        <div key={gi} className={gi ? 'mt-5' : ''}>
          {group.title && (
            <div className="relative whitespace-nowrap px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              <span className={fade(collapsed)}>{group.title}</span>
              {/* In the rail a short rule keeps the groups apart */}
              <span aria-hidden="true" className={cx('absolute left-[15px] top-2 h-px w-[18px] bg-gray-200', fade(!collapsed))} />
            </div>
          )}
          <ul className="space-y-0.5">
            {group.items.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cx(
                      'relative flex h-10 items-center gap-3 overflow-hidden rounded-lg px-[15px] text-sm font-medium transition-colors duration-150',
                      isActive ? 'text-brand-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId={indicatorId}
                          aria-hidden="true"
                          className="absolute inset-0 rounded-lg bg-brand-100 ring-1 ring-inset ring-brand-200"
                          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                        />
                      )}
                      <Icon size={18} aria-hidden="true" className={cx('relative shrink-0', isActive ? 'text-brand-700' : 'text-gray-400')} />
                      <span className={cx('relative whitespace-nowrap', fade(collapsed))}>{label}</span>
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

function AccountFooter({ onSignOut, collapsed = false }) {
  const { user, restaurant } = useAuth();
  const name = restaurant?.nameEn || user?.businessName || 'Your brand';
  return (
    <div className="border-t border-gray-200 p-3">
      {/* Sign out is pinned to the right edge, which lands it in the middle of the rail */}
      <div className="relative flex items-center rounded-lg px-2 py-2">
        <div className={cx('flex min-w-0 flex-1 items-center gap-3 pr-9', fade(collapsed))}>
          {restaurant?.logoUrl ? (
            <img src={restaurant.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain ring-1 ring-gray-200" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700" aria-hidden="true">
              {name[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-gray-900">{name}</div>
            <div className="truncate text-xs text-gray-500">{user?.email}</div>
          </div>
        </div>
        <IconButton label="Sign out" onClick={onSignOut} variant="danger" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2">
          <LogOut size={16} />
        </IconButton>
      </div>
    </div>
  );
}

function Brand({ collapsed = false, onToggle }) {
  return (
    <div className="relative flex items-center px-5 pb-5 pt-5">
      <div className={cx('flex items-center gap-3 whitespace-nowrap', fade(collapsed))}>
        <LogoMark size={40} />
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-tight text-gray-900">DINEZA</div>
          <div className="text-[11px] font-medium text-gray-500">Brand manager</div>
        </div>
      </div>
      {/* Pinned to the right edge: in the 72px rail that is exactly the centre */}
      {onToggle && (
        <IconButton
          label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          onClick={onToggle}
          className="absolute right-[18px] top-1/2 -translate-y-1/2"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </IconButton>
      )}
    </div>
  );
}

const SIDEBAR_KEY = 'qm_sidebar_collapsed';
const SIDEBAR_MOTION = 'duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';

export default function DashboardLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef(null);
  const menuButtonRef = useRef(null);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, c ? '0' : '1');
      } catch {
        // Private mode or blocked storage: the choice just isn't remembered
      }
      return !c;
    });
  };

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
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-30 hidden flex-col overflow-hidden border-r border-gray-200 bg-white transition-[width] lg:flex',
          SIDEBAR_MOTION,
          collapsed ? 'w-[72px]' : 'w-[248px]'
        )}
      >
        <Brand collapsed={collapsed} onToggle={toggleSidebar} />
        <NavItems indicatorId="nav-indicator-desktop" collapsed={collapsed} />
        <AccountFooter onSignOut={handleLogout} collapsed={collapsed} />
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
              className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-white shadow-pop"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.26, ease: EASE }}
            >
              <div className="flex items-center justify-between pe-3">
                <Brand />
                <IconButton label="Close menu" onClick={() => setMobileOpen(false)}>
                  <X size={18} />
                </IconButton>
              </div>
              <NavItems indicatorId="nav-indicator-mobile" onNavigate={() => setMobileOpen(false)} />
              <AccountFooter onSignOut={handleLogout} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <main
        id="main"
        tabIndex={-1}
        className={cx('outline-none transition-[padding]', SIDEBAR_MOTION, collapsed ? 'lg:pl-[72px]' : 'lg:pl-[248px]')}
      >
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
