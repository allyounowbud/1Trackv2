import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ModalProvider } from './contexts/ModalContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { CartProvider } from './contexts/CartContext';
import { GlobalHeaderProvider } from './contexts/GlobalHeaderContext';
import ResponsiveLayout from './components/layout/ResponsiveLayout';
import ScrollToTop from './components/ScrollToTop';
import Collection from './pages/Collection';
import SearchApi from './pages/SearchApi';
import PokemonPage from './pages/PokemonPage';
import OtherPage from './pages/OtherPage';
import Shipments from './pages/Shipments';
import Analytics from './pages/Analytics';
import Orders from './pages/Orders';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
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
              <GlobalHeaderProvider>
                <Router>
              <ScrollToTop />
              <div className="min-h-screen transition-colors duration-200">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/*" element={
                    <AuthGuard>
                      <ResponsiveLayout>
                        <Routes>
                          <Route path="/" element={<Collection />} />
                          <Route path="/categories" element={<SearchApi />} />
                          <Route path="/categories/:game" element={<SearchApi />} />
                          <Route path="/categories/:game/expansions/:expansionId" element={<SearchApi />} />
                          
                          {/* Legacy route redirect */}
                          <Route path="/search" element={<SearchApi />} />
                          <Route path="/search/:game" element={<SearchApi />} />
                          <Route path="/search/:game/expansions/:expansionId" element={<SearchApi />} />
                          
                          {/* Game-specific routes */}
                          <Route path="/pokemon" element={<PokemonPage />} />
                          <Route path="/pokemon/expansions/:expansionId" element={<PokemonPage />} />
                          <Route path="/other" element={<OtherPage />} />
                          
                          {/* Other routes */}
                          <Route path="/shipments" element={<Shipments />} />
                          <Route path="/analytics" element={<Analytics />} />
                          <Route path="/orders" element={<Orders />} />
                          <Route path="/settings" element={<Settings />} />
                          
                          {/* Admin routes */}
                          <Route path="/admin" element={<AdminDashboard />} />
                        </Routes>
                      </ResponsiveLayout>
                    </AuthGuard>
                  } />
                </Routes>
              </div>
            </Router>
              </GlobalHeaderProvider>
            </CartProvider>
          </ModalProvider>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;