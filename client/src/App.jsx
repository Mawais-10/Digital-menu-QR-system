import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { Spinner } from './components/ui.jsx';
import DashboardLayout from './components/DashboardLayout.jsx';
// import Landing from './pages/Landing.jsx';          // RESTORE: landing page (also uncomment its route below)
import Login from './pages/auth/Login.jsx';
// import Signup from './pages/auth/Signup.jsx';       // RESTORE: signup page (also uncomment its route below)
import Onboarding from './pages/Onboarding.jsx';
import Overview from './pages/dashboard/Overview.jsx';
import MenuManagement from './pages/dashboard/MenuManagement.jsx';
import Branches from './pages/dashboard/Branches.jsx';
import BranchDetail from './pages/dashboard/BranchDetail.jsx';
import QRManager from './pages/dashboard/QRManager.jsx';
import Branding from './pages/dashboard/Branding.jsx';
import Settings from './pages/dashboard/Settings.jsx';
import PublicMenu from './pages/PublicMenu.jsx';

function Protected({ children, needsRestaurant = true }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner className="min-h-screen" />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (needsRestaurant && !user.restaurantId) return <Navigate to="/onboarding" replace />;
  if (!needsRestaurant && user.restaurantId) return <Navigate to="/dashboard" replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner className="min-h-screen" />;
  if (user) return <Navigate to={user.restaurantId ? '/dashboard' : '/onboarding'} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* App opens straight on the sign-in page for now */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      {/* RESTORE: landing page
      <Route path="/" element={<Landing />} />
      */}
      <Route path="/menu/:slug" element={<PublicMenu />} />

      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
