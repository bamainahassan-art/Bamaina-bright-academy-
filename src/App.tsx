import { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, type PageRoute } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { AcademicsPage } from './pages/AcademicsPage';
import { AdmissionsPage } from './pages/AdmissionsPage';
import { NewsGalleryPage } from './pages/NewsGalleryPage';
import { ContactPage } from './pages/ContactPage';
import { LoginPage } from './pages/LoginPage';
import { PortalPage } from './pages/PortalPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import type { PublicBootstrap } from './lib/types';

function AppShell() {
  const { user, loading: authLoading, logout } = useAuth();
  const [page, setPage] = useState<PageRoute>('home');
  const [publicData, setPublicData] = useState<PublicBootstrap | null>(null);
  const [loadingPublic, setLoadingPublic] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPublicData = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await fetch('/api/public/bootstrap');
      if (!res.ok) {
        throw new Error('Unable to load school information.');
      }
      const json = (await res.json()) as PublicBootstrap;
      setPublicData(json);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Network error loading school portal.');
    } finally {
      setLoadingPublic(false);
    }
  }, []);

  useEffect(() => {
    loadPublicData();
  }, [loadPublicData]);

  const navigate = (target: PageRoute) => {
    setPage(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loadingPublic || authLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-blue-900 border-t-amber-400 rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading Bamaina Bright Academy...</p>
      </div>
    );
  }

  if (loadError || !publicData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 text-center space-y-4">
          <h1 className="font-display font-bold text-lg text-blue-950">
            Bamaina Bright Academy
          </h1>
          <p className="text-sm text-red-700">{loadError || 'Unable to connect to server.'}</p>
          <button
            type="button"
            onClick={loadPublicData}
            className="px-5 py-2.5 text-sm font-semibold bg-blue-900 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isStaff =
    user && ['super_admin', 'headteacher', 'accountant', 'teacher'].includes(user.role);

  const handleLoginSuccess = (loggedUser: NonNullable<typeof user>) => {
    const staffRole = ['super_admin', 'headteacher', 'accountant', 'teacher'].includes(
      loggedUser.role
    );
    navigate(staffRole ? 'admin' : 'portal');
  };

  const renderPage = () => {
    if (page === 'admin') {
      if (!user) return <LoginPage onSuccess={handleLoginSuccess} />;
      if (!isStaff) return <PortalPage onNavigate={navigate} />;
      return (
        <AdminDashboardPage
          publicData={publicData}
          onReloadPublic={loadPublicData}
          onNavigate={navigate}
        />
      );
    }

    if (page === 'portal') {
      if (!user) return <LoginPage onSuccess={handleLoginSuccess} />;
      if (isStaff) {
        return (
          <AdminDashboardPage
            publicData={publicData}
            onReloadPublic={loadPublicData}
            onNavigate={navigate}
          />
        );
      }
      return <PortalPage onNavigate={navigate} />;
    }

    switch (page) {
      case 'about':
        return <AboutPage data={publicData} onNavigate={navigate} />;
      case 'academics':
        return <AcademicsPage data={publicData} onNavigate={navigate} />;
      case 'admissions':
        return <AdmissionsPage data={publicData} />;
      case 'news':
        return (
          <NewsGalleryPage
            mode="news"
            data={publicData}
            onSwitchMode={(m) => navigate(m)}
          />
        );
      case 'gallery':
        return (
          <NewsGalleryPage
            mode="gallery"
            data={publicData}
            onSwitchMode={(m) => navigate(m)}
          />
        );
      case 'contact':
        return <ContactPage data={publicData} />;
      case 'login':
        return <LoginPage onSuccess={handleLoginSuccess} />;
      case 'home':
      default:
        return <HomePage data={publicData} onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Navbar
        activePage={page}
        onNavigate={navigate}
        settings={publicData.settings}
        user={user}
        onLogout={() => {
          logout();
          navigate('home');
        }}
      />
      <div className="flex-1">{renderPage()}</div>
      {page !== 'admin' && (
        <Footer settings={publicData.settings} onNavigate={navigate} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
