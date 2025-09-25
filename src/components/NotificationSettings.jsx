import { useState, useEffect } from 'react';
import notificationService from '../services/notificationService';

const NotificationSettings = () => {
  const [settings, setSettings] = useState({
    isSupported: false,
    permission: 'denied',
    isEnabled: false,
    hasSubscription: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      const initialized = await notificationService.initialize();
      if (initialized) {
        const currentSettings = notificationService.getSettings();
        setSettings(currentSettings);
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      setError('Failed to initialize notification service');
    }
  };

  const handleRequestPermission = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const granted = await notificationService.requestPermission();
      if (granted) {
        await notificationService.subscribe();
        setSuccess('Notifications enabled successfully!');
        const updatedSettings = notificationService.getSettings();
        setSettings(updatedSettings);
      } else {
        setError('Notification permission was denied');
      }
    } catch (error) {
      console.error('Failed to request permission:', error);
      setError('Failed to enable notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await notificationService.unsubscribe();
      setSuccess('Notifications disabled successfully');
      const updatedSettings = notificationService.getSettings();
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to disable notifications:', error);
      setError('Failed to disable notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await notificationService.showNotification(
        '🔔 Test Notification',
        {
          body: 'This is a test notification from OneTrack!',
          tag: 'test-notification'
        }
      );
      setSuccess('Test notification sent!');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      setError('Failed to send test notification');
    }
  };

  const handleTestPriceAlert = async () => {
    try {
      await notificationService.showPriceAlert(
        'Pikachu ex #179',
        45.00,
        40.00,
        true
      );
      setSuccess('Test price alert sent!');
    } catch (error) {
      console.error('Failed to send test price alert:', error);
      setError('Failed to send test price alert');
    }
  };

  if (!settings.isSupported) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-3">Push Notifications</h3>
        <div className="text-gray-400">
          <p>Push notifications are not supported in this browser.</p>
          <p className="text-sm mt-2">Please use a modern browser like Chrome, Firefox, or Safari.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-white font-medium text-sm">Notifications</h4>
      
      {/* Error/Success Messages */}
      {error && (
        <div className="p-2 bg-red-900/20 border border-red-500/30 rounded text-red-300 text-xs">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-2 bg-green-900/20 border border-green-500/30 rounded text-green-300 text-xs">
          {success}
        </div>
      )}

      {/* Price Alerts */}
      <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3a1 1 0 001 1h2a1 1 0 100-2h-1V7z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <div className="text-white text-sm font-medium">Price Alerts</div>
          </div>
        </div>
        <button
          onClick={settings.isEnabled ? handleDisableNotifications : handleRequestPermission}
          disabled={isLoading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.isEnabled ? 'bg-indigo-600' : 'bg-gray-600'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Order Updates */}
      <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 3a1 1 0 00-1 1v1a1 1 0 001 1h2a1 1 0 001-1V4a1 1 0 00-1-1H7zM4 7a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V7z" />
            </svg>
          </div>
          <div>
            <div className="text-white text-sm font-medium">Order Updates</div>
          </div>
        </div>
        <button
          onClick={settings.isEnabled ? handleDisableNotifications : handleRequestPermission}
          disabled={isLoading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.isEnabled ? 'bg-indigo-600' : 'bg-gray-600'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {settings.isEnabled && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleTestPriceAlert}
            className="px-3 py-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg transition-colors text-xs"
          >
            Test Price Alert
          </button>
          <button
            onClick={handleTestNotification}
            className="px-3 py-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg transition-colors text-xs"
          >
            Test Order Update
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;
