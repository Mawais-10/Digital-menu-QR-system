import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, UtensilsCrossed, Store, QrCode, Palette, Settings, LogOut, Menu as MenuIcon, X, ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { LogoMark } from './ui.jsx';

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/menu', label: 'Master Menu', icon: UtensilsCrossed },
  { to: '/dashboard/branches', label: 'Branches', icon: Store },
  { to: '/dashboard/qr', label: 'QR Codes', icon: QrCode },
  { to: '/dashboard/branding', label: 'Branding', icon: Palette },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout() {
  const { user, restaurant, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <LogoMark />
        <div>
          <div className="text-[15px] font-extrabold tracking-tight text-gray-900">Simat</div>
          <div className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Menu Platform</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                isActive ? 'bg-brand-50 text-brand-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-100 p-4">
        <div className="mb-3 flex items-center gap-3 px-1.5">
          {restaurant?.logoUrl ? (
            <img src={restaurant.logoUrl} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-brand-100" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600">
              {(restaurant?.nameEn || user?.businessName || '?')[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-gray-900">{restaurant?.nameEn || user?.businessName}</div>
            <div className="truncate text-xs text-gray-400">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-gray-100 bg-white lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-gray-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="animate-fade-in absolute inset-y-0 left-0 w-72 bg-white shadow-lift">
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
              <X size={18} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Topbar (mobile) */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100">
          <MenuIcon size={20} />
        </button>
        <div className="flex items-center gap-2">
          <LogoMark size={28} />
          <span className="text-sm font-extrabold text-gray-900">Simat</span>
        </div>
        <div className="w-9" />
      </header>

      <main className="px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
