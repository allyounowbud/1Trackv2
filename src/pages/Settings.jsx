import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../contexts/ModalContext';

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { openModal, closeModal } = useModal();
  const [loading, setLoading] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

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
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Profile</h1>
        </div>
      </div>

      {/* Profile Content */}
      <div className="px-4 pb-4">
        {/* User Info Card */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-4 mb-4">
            {/* Avatar */}
            <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center">
              {user?.user_metadata?.avatar_url ? (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="Profile" 
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-xl">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </div>
            
            {/* User Details */}
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white">
                {user?.user_metadata?.full_name || user?.user_metadata?.name || 'User'}
              </h2>
              <p className="text-gray-400 text-sm">{user?.email}</p>
              {user?.user_metadata?.discord_username && (
                <p className="text-indigo-400 text-sm">
                  Discord: {user.user_metadata.discord_username}
                </p>
              )}
            </div>
          </div>

          {/* Account Info */}
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-400 text-sm">Account Type</span>
              <span className="text-white text-sm">
                {user?.app_metadata?.provider === 'discord' ? 'Discord' : 'Email'}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-400 text-sm">Member Since</span>
              <span className="text-white text-sm">
                {formatDate(user?.created_at)}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-400 text-sm">Last Sign In</span>
              <span className="text-white text-sm">
                {formatDate(user?.last_sign_in_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Settings Options */}
        <div className="space-y-3">
          {/* Account Settings */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">Account Settings</h3>
            <div className="space-y-2">
              <button className="w-full text-left p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors">
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

              <button className="w-full text-left p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors">
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
            </div>
          </div>

          {/* App Settings */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">App Settings</h3>
            <div className="space-y-2">
              <button className="w-full text-left p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">Preferences</div>
                      <div className="text-gray-400 text-xs">Customize your app experience</div>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>

              <button className="w-full text-left p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors">
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

          {/* Sign Out Section */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">Account Actions</h3>
            <button 
              onClick={() => {
                setShowSignOutConfirm(true);
                openModal();
              }}
              className="w-full text-left p-3 bg-red-600/20 hover:bg-red-600/30 rounded-lg transition-colors border border-red-500/30"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <div className="text-red-400 text-sm font-medium">Sign Out</div>
                  <div className="text-gray-400 text-xs">Sign out of your account</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 modal-overlay">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-sm">
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
    </div>
  );
};

export default Settings;