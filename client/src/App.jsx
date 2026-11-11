import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SiteLayout, AppLayout } from './components/AppLayout';
import { DashboardRedirect, ProtectedRoute } from './components/ProtectedRoute';
import Home from './pages/Home';
import About from './pages/About';
import HowItWorks from './pages/HowItWorks';
import Departments from './pages/Departments';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import Track from './pages/Track';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import NewGrievance from './pages/citizen/NewGrievance';
import CmoDashboard from './pages/cmo/CmoDashboard';
import OfficerDashboard from './pages/officer/OfficerDashboard';
import GrievanceDetailPage from './pages/GrievanceDetailPage';

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public website */}
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="departments" element={<Departments />} />
          <Route path="faq" element={<FAQ />} />
          <Route path="contact" element={<Contact />} />
          <Route path="track" element={<Track />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Authenticated dashboard shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="dashboard" element={<DashboardRedirect />} />
            <Route path="grievances/:id" element={<GrievanceDetailPage />} />
          </Route>
        </Route>

        {/* Citizen */}
        <Route element={<ProtectedRoute roles={['CITIZEN']} />}>
          <Route element={<AppLayout />}>
            <Route path="citizen" element={<CitizenDashboard />} />
            <Route path="citizen/new" element={<NewGrievance />} />
          </Route>
        </Route>

        {/* CMO */}
        <Route element={<ProtectedRoute roles={['CMO_ADMIN']} />}>
          <Route element={<AppLayout />}>
            <Route path="cmo" element={<CmoDashboard />} />
          </Route>
        </Route>

        {/* Department officer */}
        <Route element={<ProtectedRoute roles={['DEPT_OFFICER']} />}>
          <Route element={<AppLayout />}>
            <Route path="officer" element={<OfficerDashboard />} />
          </Route>
        </Route>

        <Route path="/home" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
