import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../contexts/ModalContext';
import { useAdmin } from '../hooks/useAdmin';
import { Shield } from 'lucide-react';
import ThemeSettings from '../components/ThemeSettings';
import ScrydexSyncSettings from '../components/ScrydexSyncSettings';
import AccountDeletionModal from '../components/AccountDeletionModal';

const Settings = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const { openModal, closeModal } = useModal();
  const [loading, setLoading] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showAccountDeletion, setShowAccountDeletion] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const { error } = await signOut();
      if (error) {
        console.error('Sign out error:', error);
      } else {
        navigate('/login');
      }
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setLoading(false);
      setShowSignOutConfirm(false);
      closeModal();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="px-4 md:px-6 lg:px-8 py-3">
        <div className="p-4 md:p-10 lg:p-12">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-white">Settings</h1>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="px-4 md:px-6 lg:px-8 pb-4">
        {/* Profile Card with Sign Out */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Avatar */}
              <div className="w-12 h-12 bg-blue-400 rounded-full flex items-center justify-center">
                {user?.user_metadata?.avatar_url ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt="Profile" 
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-lg">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              
              {/* User Details */}
              <div>
                <div className="flex items-center space-x-3">
                  <h2 className="text-lg font-semibold text-white">
                    {user?.user_metadata?.full_name || user?.user_metadata?.name || 'User'}
                  </h2>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    isAdmin 
                      ? 'bg-green-900/30 text-green-300 border border-green-800/30' 
                      : 'bg-blue-900/30 text-blue-300 border border-blue-800/30'
                  }`}>
                    {isAdmin ? 'Admin' : 'Beta User'}
                  </span>
                </div>
                <p className="text-gray-400 text-sm">{user?.email}</p>
                {user?.user_metadata?.discord_username && (
                  <p className="text-indigo-400 text-xs">
                    Discord: {user.user_metadata.discord_username}
                  </p>
                )}
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-gray-400">Member Since</span>
              <p className="text-white">
                {formatDate(user?.created_at)}
              </p>
            </div>
            
            {/* Sign Out Button - More Prominent */}
            <button 
              onClick={() => {
                setShowSignOutConfirm(true);
                openModal();
              }}
              className="px-4 py-2 text-red-400 border border-red-500/30 hover:bg-red-500/10 hover:border-red-400 rounded-lg transition-colors text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-4">
          {/* App Settings */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
            <h3 className="text-white font-medium mb-4">App Settings</h3>
            <div className="space-y-6">
              {/* Theme Settings */}
              <ThemeSettings />
              
              {/* Admin Dashboard Button - Only show to admins */}
              {isAdmin && (
                <div className="pt-4 border-t border-gray-800">
                  <button
                    onClick={() => navigate('/admin')}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/10 rounded-lg">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-white font-semibold">Admin Dashboard</div>
                        <div className="text-indigo-100 text-xs">System monitoring & API management</div>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
              
              {/* Regular sync settings - Only show to non-admins */}
              {!isAdmin && <ScrydexSyncSettings />}
            </div>
          </div>



          {/* Account Settings */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
            <h3 className="text-white font-medium mb-4">Account Settings</h3>
            <div className="space-y-2">
              <button className="w-full text-left p-3 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">Profile Information</div>
                      <div className="text-gray-400 text-xs">Update your profile details</div>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>

              <button className="w-full text-left p-3 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">Privacy & Security</div>
                      <div className="text-gray-400 text-xs">Manage your privacy settings</div>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>

              <button 
                onClick={() => setShowAccountDeletion(true)}
                className="w-full text-left p-3 bg-red-600/10 hover:bg-red-600/20 rounded-lg transition-all duration-200 border border-red-500/20 hover:border-red-500/40"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-red-400 text-sm font-medium">Delete Account</div>
                      <div className="text-gray-400 text-xs">Permanently delete your account and data</div>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>
            </div>
          </div>

          {/* Help & Support */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
            <h3 className="text-white font-medium mb-3">Help & Support</h3>
            <div className="space-y-2">
              <button className="w-full text-left p-3 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">Help & Support</div>
                      <div className="text-gray-400 text-xs">Get help and contact support</div>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>






      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 modal-overlay">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 md:p-8 w-full max-w-sm">
            <h3 className="text-white font-medium mb-2">Sign Out</h3>
            <p className="text-gray-400 text-sm mb-6">
              Are you sure you want to sign out? You'll need to sign in again to access your collection.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowSignOutConfirm(false);
                  closeModal();
                }}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>
      </div>
        </div>
      )}

      {/* Account Deletion Modal */}
      <AccountDeletionModal 
        isOpen={showAccountDeletion}
        onClose={() => setShowAccountDeletion(false)}
      />

    </div>
  );
};

export default Settings;