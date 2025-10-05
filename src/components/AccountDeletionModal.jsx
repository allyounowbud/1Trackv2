import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AccountDeletionModal = ({ isOpen, onClose }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: warning, 2: confirmation, 3: processing

  const requiredText = 'DELETE MY ACCOUNT';

  const handleDeleteAccount = async () => {
    if (confirmationText !== requiredText) {
      setError('Please type the exact text to confirm account deletion');
      return;
    }

    setIsDeleting(true);
    setStep(3);
    setError('');

    try {
      // Delete all user data from orders table
      const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .eq('user_id', (await supabase.auth.getUser()).data.user.id);

      if (ordersError) {
        console.error('Error deleting orders:', ordersError);
      }

      // Delete user profile data if exists
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', (await supabase.auth.getUser()).data.user.id);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
      }

      // Delete the user account
      const { error: deleteError } = await supabase.auth.admin.deleteUser(
        (await supabase.auth.getUser()).data.user.id
      );

      if (deleteError) {
        throw deleteError;
      }

      // Sign out and redirect
      await signOut();
      navigate('/login', { 
        state: { 
          message: 'Your account and all data have been permanently deleted.' 
        } 
      });

    } catch (error) {
      console.error('Error deleting account:', error);
      setError(error.message || 'Failed to delete account. Please try again.');
      setStep(2);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return;
    setStep(1);
    setConfirmationText('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 modal-overlay z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
        {step === 1 && (
          <>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Delete Account</h3>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                <h4 className="text-red-300 font-medium mb-2">⚠️ This action cannot be undone</h4>
                <p className="text-red-200 text-sm">
                  Deleting your account will permanently remove:
                </p>
                <ul className="text-red-200 text-sm mt-2 list-disc list-inside space-y-1">
                  <li>All your collection data</li>
                  <li>All purchase and sale records</li>
                  <li>Your profile information</li>
                  <li>All app preferences and settings</li>
                </ul>
              </div>

              <p className="text-gray-300 text-sm">
                If you're having issues with the app, please consider contacting support first. 
                We're here to help!
              </p>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Confirm Deletion</h3>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-300 text-sm">
                To confirm account deletion, please type <strong className="text-red-400">{requiredText}</strong> in the box below:
              </p>
              
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={requiredText}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-transparent"
                disabled={isDeleting}
              />

              {error && (
                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <div className="text-red-300 text-sm">{error}</div>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setStep(1)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || confirmationText !== requiredText}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Account
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-lg font-semibold text-white">Deleting Account</h3>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-300 text-sm">
                Please wait while we permanently delete your account and all associated data...
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                  <span>Removing collection data...</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                  <span>Deleting account...</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AccountDeletionModal;
