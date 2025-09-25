import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ModalProvider } from './contexts/ModalContext';
import Layout from './components/layout/Layout';
import Collection from './pages/Collection';
import Search from './pages/Search';
import Settings from './pages/Settings';
import Login from './pages/Login';
import LoadingScreen from './components/LoadingScreen';
import badgeService from './services/badgeService';
import './index.css';

// Auth Guard Component
function AuthGuard({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Loading your collection..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  useEffect(() => {
    // Listen for service worker messages
    const handleMessage = (event) => {
      if (event.data?.type === 'MARK_NOTIFICATION_READ') {
        badgeService.markAsRead(event.data.notificationId);
        // Dispatch custom event to update UI
        window.dispatchEvent(new CustomEvent('badge-updated'));
      }
    };

    // Add message listener
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    // Cleanup old notifications on app start
    badgeService.cleanupOldNotifications();

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <ModalProvider>
          <Router>
            <div className="min-h-screen transition-colors duration-200">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/*" element={
                  <AuthGuard>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Collection />} />
                        <Route path="/search" element={<Search />} />
                        <Route path="/settings" element={<Settings />} />
                      </Routes>
                    </Layout>
                  </AuthGuard>
                } />
              </Routes>
            </div>
          </Router>
        </ModalProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;