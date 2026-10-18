import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth, homePath, isBranchManager } from './context/AuthContext.jsx';
import PublicMenu from './pages/PublicMenu.jsx';

// The public QR menu is the only eager route: customers on phones never download dashboard code.
const DashboardLayout = lazy(() => import('./components/DashboardLayout.jsx'));
const BranchLayout = lazy(() => import('./components/BranchLayout.jsx'));
// const Landing = lazy(() => import('./pages/Landing.jsx'));   // RESTORE: landing page (also uncomment its route below)
const Login = lazy(() => import('./pages/auth/Login.jsx'));
const ChangePassword = lazy(() => import('./pages/auth/ChangePassword.jsx'));
// const Signup = lazy(() => import('./pages/auth/Signup.jsx')); // RESTORE: signup page (also uncomment its route below)
const Onboarding = lazy(() => import('./pages/Onboarding.jsx'));
const Overview = lazy(() => import('./pages/dashboard/Overview.jsx'));
const MenuManagement = lazy(() => import('./pages/dashboard/MenuManagement.jsx'));
const Branches = lazy(() => import('./pages/dashboard/Branches.jsx'));
const BranchDetail = lazy(() => import('./pages/dashboard/BranchDetail.jsx'));
const QRManager = lazy(() => import('./pages/dashboard/QRManager.jsx'));
const Branding = lazy(() => import('./pages/dashboard/Branding.jsx'));
const Settings = lazy(() => import('./pages/dashboard/Settings.jsx'));
const BranchMenu = lazy(() => import('./pages/branch/BranchMenu.jsx'));

// Lightweight full-screen loader (kept here so the public bundle stays small)
function Spinner({ className = '' }) {
  return (
    <div className={`flex items-center justify-center py-16 ${className}`} role="status" aria-label="Loading">
      <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600" aria-hidden="true" />
    </div>
  );
}

// Brand-manager (owner) area. Branch managers are sent to their own branch screen.
// The server enforces the same rule on every API call; this only keeps navigation sensible.
function Protected({ children, needsRestaurant = true }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner className="min-h-screen" />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (isBranchManager(user)) return <Navigate to="/branch" replace />;
  if (needsRestaurant && !user.restaurantId) return <Navigate to="/onboarding" replace />;
  if (!needsRestaurant && user.restaurantId) return <Navigate to="/dashboard" replace />;
  return children;
}

// Branch-manager area
function BranchOnly({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner className="min-h-screen" />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (!isBranchManager(user)) return <Navigate to={homePath(user)} replace />;
  return children;
}

// Signed in, but the old password has to be replaced first
function NeedsNewPassword({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner className="min-h-screen" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.mustChangePassword) return <Navigate to={homePath(user)} replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner className="min-h-screen" />;
  if (user) return <Navigate to={homePath(user)} replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<Spinner className="min-h-screen" />}>
    <Routes>
      {/* App opens straight on the sign-in page for now */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      {/* RESTORE: landing page
      <Route path="/" element={<Landing />} />
      */}
      <Route path="/menu/:slug" element={<PublicMenu />} />

      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/change-password" element={<NeedsNewPassword><ChangePassword /></NeedsNewPassword>} />
      {/* RESTORE: signup page
      <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />
      */}
      <Route path="/onboarding" element={<Protected needsRestaurant={false}><Onboarding /></Protected>} />

      <Route path="/dashboard" element={<Protected><DashboardLayout /></Protected>}>
        <Route index element={<Overview />} />
        <Route path="menu" element={<MenuManagement />} />
        <Route path="branches" element={<Branches />} />
        <Route path="branches/:id" element={<BranchDetail />} />
        <Route path="qr" element={<QRManager />} />
        <Route path="branding" element={<Branding />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="/branch" element={<BranchOnly><BranchLayout /></BranchOnly>}>
        <Route index element={<BranchMenu />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
