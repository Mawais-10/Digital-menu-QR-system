import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, UtensilsCrossed, LayoutGrid, Plus, QrCode, PackageX, Users, ChevronRight, FileSpreadsheet, Palette } from 'lucide-react';
import { Card, CardHeader, StatCard, Badge, PageHeader, PageSkeleton, ErrorState, ExternalLinkButton, EmptyState, Button } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { restaurantApi, branchApi } from '../../api/endpoints.js';
import { errMsg } from '../../api/client.js';

const QUICK_ACTIONS = [
  { to: '/dashboard/menu', label: 'Add or edit menu items', icon: Plus },
  { to: '/dashboard/menu', label: 'Import the menu from Excel', icon: FileSpreadsheet },
  { to: '/dashboard/qr', label: 'Download QR codes', icon: QrCode },
  { to: '/dashboard/branding', label: 'Update logo and colors', icon: Palette },
];

export default function Overview() {
  const { user, restaurant } = useAuth();
  const [stats, setStats] = useState(null);
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [s, b] = await Promise.all([restaurantApi.stats(), branchApi.list()]);
      setStats(s.data);
      setBranches(b.data.branches);
    } catch (err) {
      setError(errMsg(err, 'Could not load your overview'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState title="Your overview could not be loaded" message={error} onRetry={load} />;
  if (!stats) return <PageSkeleton rows={4} />;

  const firstBranch = branches[0];
  const soldOutBy = stats.soldOutByBranch || {};

  return (
    <div>
      <PageHeader
        title={`Welcome back${user?.businessName ? `, ${user.businessName}` : ''}`}
        subtitle={`Here is how ${restaurant?.nameEn || 'your restaurant'} looks across your branches today.`}
        action={firstBranch && <ExternalLinkButton href={`/menu/${firstBranch.slug}`}>View live menu</ExternalLinkButton>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard label="Branches" value={stats.branches} icon={Store} to="/dashboard/branches" />
        <StatCard label="Categories" value={stats.categories} icon={LayoutGrid} to="/dashboard/menu" />
        <StatCard label="Menu items" value={stats.items} icon={UtensilsCrossed} to="/dashboard/menu" />
        <StatCard
          label="Sold out now"
          value={stats.soldOut ?? 0}
          icon={PackageX}
          tone={stats.soldOut ? 'red' : 'gray'}
          hint={stats.soldOut ? 'Across all branches' : 'Everything is available'}
        />
        <StatCard label="Branch managers" value={stats.managers ?? 0} icon={Users} tone="gray" to="/dashboard/branches" />
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader
            title="Branches"
            description="Live status and items currently sold out"
            action={<Link to="/dashboard/branches" className="text-[13px] font-semibold text-brand-700 hover:text-brand-800">Manage all</Link>}
          />
          {branches.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Store}
                title="No branches yet"
                subtitle="Create a branch to get its permanent menu link and QR code."
                action={<Link to="/dashboard/branches"><Button>Add a branch</Button></Link>}
              />
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {branches.map((b) => {
                const sold = soldOutBy[b._id] || 0;
                return (
                  <li key={b._id}>
                    <Link to={`/dashboard/branches/${b._id}`} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-gray-50">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600" aria-hidden="true">
                        <Store size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-gray-900">{b.nameEn}</div>
                        <div className="truncate font-mono text-xs text-gray-500">/menu/{b.slug}</div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                        {sold > 0 && <Badge color="red">{sold} sold out</Badge>}
                        <Badge color={b.status === 'active' ? 'green' : 'gray'} dot>{b.status === 'active' ? 'Active' : 'Inactive'}</Badge>
                      </div>
                      <ChevronRight size={16} className="shrink-0 text-gray-400" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="h-fit">
          <CardHeader title="Quick actions" />
          <ul className="p-2">
            {QUICK_ACTIONS.map(({ to, label, icon: Icon }) => (
              <li key={label}>
                <Link to={to} className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900">
                  <span className="rounded-md bg-brand-50 p-1.5 text-brand-700" aria-hidden="true"><Icon size={15} /></span>
                  <span className="flex-1">{label}</span>
                  <ChevronRight size={15} className="text-gray-400" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
