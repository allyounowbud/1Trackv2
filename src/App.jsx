import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ModalProvider } from './contexts/ModalContext';
import ResponsiveLayout from './components/layout/ResponsiveLayout';
import ResponsiveCollection from './components/responsive/ResponsiveCollection';
import ResponsiveSearch from './components/responsive/ResponsiveSearch';
import Analytics from './pages/Analytics';
import Orders from './pages/Orders';
import Settings from './pages/Settings';
import Login from './pages/Login';
import LoadingScreen from './components/LoadingScreen';
import ScreenSizeDebug from './components/debug/ScreenSizeDebug';
import SimpleResponsiveTest from './components/debug/SimpleResponsiveTest';
import badgeService from './services/badgeService';
import './index.css';

// Auth Guard Component
function AuthGuard({ children }) {
  const { user, loading } = useAuth();

  console.log('🔐 AuthGuard render:', { user: !!user, loading, windowWidth: window.innerWidth });

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
    console.log('🚀 App component mounted, window width:', window.innerWidth);
    
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
              <ScreenSizeDebug />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/*" element={
                  <AuthGuard>
                    <ResponsiveLayout>
                      <Routes>
                        <Route path="/" element={(() => {
                          const isDesktop = window.innerWidth >= 768;
                          console.log('🧪 Inline test render:', { width: window.innerWidth, isDesktop });
                          return (
                            <div style={{ 
                              background: isDesktop ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                              color: 'white',
                              padding: '20px',
                              textAlign: 'center',
                              fontSize: '24px',
                              fontWeight: 'bold',
                              minHeight: '100vh'
                            }}>
                              {isDesktop ? '🖥️ DESKTOP LAYOUT IS WORKING! 🖥️' : '📱 MOBILE LAYOUT'}
                              <br />
                              Width: {window.innerWidth}px
                              <br />
                              Breakpoint: 768px
                              <br />
                              Is Desktop: {isDesktop ? 'YES' : 'NO'}
                            </div>
                          );
                        })()} />
                        <Route path="/search" element={<ResponsiveSearch />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/orders" element={<Orders />} />
                        <Route path="/settings" element={<Settings />} />
                      </Routes>
                    </ResponsiveLayout>
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