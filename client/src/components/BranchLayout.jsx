import { Suspense, useCallback, useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { myBranchApi } from '../api/endpoints.js';
import { errMsg } from '../api/client.js';
import { LogoMark, IconButton, ExternalLinkButton, ErrorState, PageSkeleton, Badge } from './ui.jsx';

// Shell for branch managers: their branch only, no brand-level navigation.
export default function BranchLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [ctx, setCtx] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await myBranchApi.get();
      setCtx(data);
    } catch (err) {
      setError(errMsg(err, 'Could not load your branch'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const branch = ctx?.branch;
  const restaurant = ctx?.restaurant;

  return (
    <MotionConfig reducedMotion="user">
    <div className="dash min-h-screen">
      <a
        href="#main"
        className="sr-only z-[60] rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-pop focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
          {restaurant?.logoUrl ? (
            <img src={restaurant.logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain ring-1 ring-gray-200" />
          ) : (
            <LogoMark size={36} />
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-gray-900">{branch?.nameEn || 'Your branch'}</span>
              {branch && branch.status !== 'active' && <Badge color="gray" dot>Inactive</Badge>}
            </div>
            <div className="truncate text-xs text-gray-500">
              {restaurant?.nameEn ? `${restaurant.nameEn} · ` : ''}
              {user?.name || user?.email}
            </div>
          </div>
          {branch && (
            <div className="hidden sm:block">
              <ExternalLinkButton href={`/menu/${branch.slug}`} size="sm">Live menu</ExternalLinkButton>
            </div>
          )}
          <IconButton label="Sign out" onClick={handleLogout} variant="outline">
            <LogOut size={16} />
          </IconButton>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="outline-none">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
          {error ? (
            <ErrorState title="Your branch could not be loaded" message={error} onRetry={load} />
          ) : !ctx ? (
            <PageSkeleton rows={6} />
          ) : (
            <Suspense fallback={<PageSkeleton rows={6} />}>
              <Outlet context={ctx} />
            </Suspense>
          )}
          <p className="mt-10 flex items-center justify-center gap-1.5 text-xs text-gray-500">
            <Store size={13} aria-hidden="true" /> Branch manager access · menu details are managed by your brand manager
          </p>
        </div>
      </main>
    </div>
    </MotionConfig>
  );
}
