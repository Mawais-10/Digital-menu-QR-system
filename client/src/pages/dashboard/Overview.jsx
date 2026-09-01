import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, UtensilsCrossed, LayoutGrid, Plus, QrCode, ExternalLink, ArrowRight } from 'lucide-react';
import { Card, Spinner, Button } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { restaurantApi, branchApi } from '../../api/endpoints.js';

export default function Overview() {
  const { user, restaurant } = useAuth();
  const [stats, setStats] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([restaurantApi.stats(), branchApi.list()])
      .then(([s, b]) => {
        setStats(s.data);
        setBranches(b.data.branches);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const firstBranch = branches[0];
  const cards = [
    { label: 'Branches', value: stats?.branches ?? 0, icon: Store, to: '/dashboard/branches' },
    { label: 'Categories', value: stats?.categories ?? 0, icon: LayoutGrid, to: '/dashboard/menu' },
    { label: 'Menu items', value: stats?.items ?? 0, icon: UtensilsCrossed, to: '/dashboard/menu' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-gray-900">
          Welcome back{user?.businessName ? `, ${user.businessName}` : ''} 
        </h1>
        <p className="mt-1 text-sm text-gray-500">Here's what's happening with {restaurant?.nameEn || 'your restaurant'}.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, to }) => (
          <Link key={label} to={to}>
            <Card className="group p-5 transition-shadow hover:shadow-lift">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-brand-50 p-2.5 text-brand-500"><Icon size={20} /></div>
                <ArrowRight size={16} className="text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" />
              </div>
              <div className="mt-4 text-3xl font-extrabold text-gray-900">{value}</div>
              <div className="mt-0.5 text-sm font-medium text-gray-500">{label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Quick actions */}
        <Card className="p-6">
          <h2 className="mb-4 text-base font-bold text-gray-900">Quick actions</h2>
          <div className="space-y-2.5">
            <Link to="/dashboard/menu" className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-brand-50 hover:text-brand-600">
              <Plus size={17} /> Add a menu item
            </Link>
            <Link to="/dashboard/qr" className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-brand-50 hover:text-brand-600">
              <QrCode size={17} /> Download QR codes
            </Link>
            {firstBranch && (
              <a
                href={`/menu/${firstBranch.slug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-brand-50 hover:text-brand-600"
              >
                <ExternalLink size={17} /> View your live menu
              </a>
            )}
          </div>
        </Card>

        {/* Branches snapshot */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Your branches</h2>
            <Link to="/dashboard/branches" className="text-xs font-semibold text-brand-600 hover:text-brand-700">Manage</Link>
          </div>
          {branches.length === 0 ? (
            <p className="text-sm text-gray-400">No branches yet.</p>
          ) : (
            <div className="space-y-2.5">
              {branches.slice(0, 4).map((b) => (
                <div key={b._id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-800">{b.nameEn}</div>
                    <div className="truncate font-mono text-[11px] text-gray-400">/menu/{b.slug}</div>
                  </div>
                  <span className={`ms-3 h-2 w-2 shrink-0 rounded-full ${b.status === 'active' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
