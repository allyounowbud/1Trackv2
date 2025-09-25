/**
 * Notification Service for OneTrack PWA
 * Handles push notifications, permission requests, and notification management
 */

import badgeService from './badgeService.js';

class NotificationService {
  constructor() {
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    this.permission = this.isSupported ? Notification.permission : 'denied';
    this.registration = null;
    this.subscription = null;
  }

  /**
   * Initialize the notification service
   */
  async initialize() {
    if (!this.isSupported) {
      console.warn('⚠️ Push notifications are not supported in this browser');
      return false;
    }

    try {
      // Get service worker registration
      this.registration = await navigator.serviceWorker.ready;
      
      // Check if we already have a subscription
      this.subscription = await this.registration.pushManager.getSubscription();
      
      console.log('✅ Notification service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
      return false;
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Push notifications are not supported');
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      
      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        return true;
      } else {
        console.log('❌ Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      throw error;
    }
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled() {
    return this.isSupported && this.permission === 'granted';
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe() {
    if (!this.isEnabled()) {
      throw new Error('Notifications not enabled');
    }

    if (!this.registration) {
      throw new Error('Service worker not ready');
    }

    try {
      // For now, we'll use a simple subscription without a push server
      // In production, you'd want to use a service like Firebase Cloud Messaging
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        // applicationServerKey: 'your-vapid-public-key' // Add this for real push notifications
      });

      this.subscription = subscription;
      console.log('✅ Subscribed to push notifications');
      
      // Store subscription in localStorage for persistence
      localStorage.setItem('pushSubscription', JSON.stringify(subscription));
      
      return subscription;
    } catch (error) {
      console.error('❌ Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe() {
    if (!this.subscription) {
      return true;
    }

    try {
      const success = await this.subscription.unsubscribe();
      this.subscription = null;
      localStorage.removeItem('pushSubscription');
      console.log('✅ Unsubscribed from push notifications');
      return success;
    } catch (error) {
      console.error('❌ Failed to unsubscribe from push notifications:', error);
      throw error;
    }
  }

  /**
   * Show a local notification
   */
  async showNotification(title, options = {}) {
    if (!this.isEnabled()) {
      throw new Error('Notifications not enabled');
    }

    const defaultOptions = {
      body: '',
      icon: '/icons/icon-192x192.svg',
      badge: '/icons/icon-72x72.svg',
      vibrate: [100, 50, 100],
      requireInteraction: false,
      silent: false,
      ...options
    };

    try {
      // Generate unique notification ID
      const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Add to badge service
      await badgeService.addNotification(notificationId, {
        type: options.data?.type || 'general',
        title: title,
        data: options.data || {}
      });

      // Add notification ID to options for tracking
      defaultOptions.data = {
        ...defaultOptions.data,
        notificationId: notificationId
      };

      if (this.registration) {
        // Use service worker to show notification
        await this.registration.showNotification(title, defaultOptions);
      } else {
        // Fallback to direct notification
        new Notification(title, defaultOptions);
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to show notification:', error);
      throw error;
    }
  }

  /**
   * Show price alert notification
   */
  async showPriceAlert(cardName, currentPrice, targetPrice, isIncrease = true) {
    const direction = isIncrease ? 'increased' : 'decreased';
    const emoji = isIncrease ? '📈' : '📉';
    
    return this.showNotification(
      `${emoji} Price Alert`,
      {
        body: `${cardName} has ${direction} to $${currentPrice.toFixed(2)} (target: $${targetPrice.toFixed(2)})`,
        tag: `price-alert-${cardName}`,
        requireInteraction: true,
        actions: [
          {
            action: 'view',
            title: 'View Card',
            icon: '/icons/icon-96x96.svg'
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
            icon: '/icons/icon-96x96.svg'
          }
        ],
        data: {
          type: 'price-alert',
          cardName,
          currentPrice,
          targetPrice,
          isIncrease
        }
      }
    );
  }

  /**
   * Show collection update notification
   */
  async showCollectionUpdate(itemName, action = 'added') {
    const emoji = action === 'added' ? '➕' : '➖';
    const actionText = action === 'added' ? 'added to' : 'removed from';
    
    return this.showNotification(
      `${emoji} Collection Updated`,
      {
        body: `${itemName} has been ${actionText} your collection`,
        tag: `collection-${action}-${itemName}`,
        actions: [
          {
            action: 'view',
            title: 'View Collection',
            icon: '/icons/icon-96x96.svg'
          }
        ],
        data: {
          type: 'collection-update',
          itemName,
          action
        }
      }
    );
  }

  /**
   * Show market update notification
   */
  async showMarketUpdate(message) {
    return this.showNotification(
      '📊 Market Update',
      {
        body: message,
        tag: 'market-update',
        data: {
          type: 'market-update'
        }
      }
    );
  }

  /**
   * Show app update notification
   */
  async showAppUpdate() {
    return this.showNotification(
      '🔄 App Update Available',
      {
        body: 'A new version of OneTrack is available. Refresh to update.',
        tag: 'app-update',
        requireInteraction: true,
        actions: [
          {
            action: 'refresh',
            title: 'Refresh App',
            icon: '/icons/icon-96x96.svg'
          },
          {
            action: 'later',
            title: 'Later',
            icon: '/icons/icon-96x96.svg'
          }
        ],
        data: {
          type: 'app-update'
        }
      }
    );
  }

  /**
   * Get notification settings
   */
  getSettings() {
    return {
      isSupported: this.isSupported,
      permission: this.permission,
      isEnabled: this.isEnabled(),
      hasSubscription: !!this.subscription
    };
  }

  /**
   * Clear all notifications
   */
  async clearAll() {
    if (this.registration) {
      const notifications = await this.registration.getNotifications();
      notifications.forEach(notification => notification.close());
    }
    
    // Clear badge service as well
    await badgeService.clearAll();
  }

  /**
   * Mark notification as read when user interacts with it
   */
  async markNotificationAsRead(notificationId) {
    try {
      await badgeService.markAsRead(notificationId);
      return true;
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    try {
      await badgeService.markAllAsRead();
      return true;
    } catch (error) {
      console.error('❌ Failed to mark all notifications as read:', error);
      return false;
    }
  }

  /**
   * Get badge service instance for direct access
   */
  getBadgeService() {
    return badgeService;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
