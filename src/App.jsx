import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ModalProvider } from './contexts/ModalContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { CartProvider } from './contexts/CartContext';
import ResponsiveLayout from './components/layout/ResponsiveLayout';
import Collection from './pages/Collection';
import SearchApi from './pages/SearchApi';
import Shipments from './pages/Shipments';
import Analytics from './pages/Analytics';
import Orders from './pages/Orders';
import Settings from './pages/Settings';
import Login from './pages/Login';
import LoadingScreen from './components/LoadingScreen';
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

  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <ModalProvider>
            <CartProvider>
              <Router>
              <div className="min-h-screen transition-colors duration-200">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/*" element={
                    <AuthGuard>
                      <ResponsiveLayout>
                        <Routes>
                          <Route path="/" element={<Collection />} />
                          <Route path="/search" element={<SearchApi />} />
                          <Route path="/search/:game" element={<SearchApi />} />
                          <Route path="/search/:game/expansions/:expansionId" element={<SearchApi />} />
                          <Route path="/shipments" element={<Shipments />} />
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
            </CartProvider>
          </ModalProvider>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;