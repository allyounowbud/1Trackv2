/**
 * Badge Service for PWA Notification Badges
 * Manages unread notification counts and PWA badge updates
 */

class BadgeService {
  constructor() {
    this.isSupported = 'setAppBadge' in navigator;
    this.unreadCount = 0;
    this.notifications = new Map(); // Track individual notifications
    this.storageKey = 'onetrack_badge_data';
    
    // Load persisted data
    this.loadFromStorage();
    
    console.log('🔔 BadgeService initialized:', {
      isSupported: this.isSupported,
      unreadCount: this.unreadCount
    });
  }

  /**
   * Load badge data from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.unreadCount = data.unreadCount || 0;
        this.notifications = new Map(data.notifications || []);
        console.log('📦 Loaded badge data from storage:', { unreadCount: this.unreadCount });
      }
    } catch (error) {
      console.error('❌ Failed to load badge data:', error);
      this.unreadCount = 0;
      this.notifications = new Map();
    }
  }

  /**
   * Save badge data to localStorage
   */
  saveToStorage() {
    try {
      const data = {
        unreadCount: this.unreadCount,
        notifications: Array.from(this.notifications.entries()),
        lastUpdated: Date.now()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('❌ Failed to save badge data:', error);
    }
  }

  /**
   * Add a new notification and update badge
   */
  async addNotification(notificationId, notificationData = {}) {
    const notification = {
      id: notificationId,
      timestamp: Date.now(),
      read: false,
      type: notificationData.type || 'general',
      title: notificationData.title || 'New Notification',
      data: notificationData.data || {}
    };

    this.notifications.set(notificationId, notification);
    this.unreadCount++;
    
    await this.updateBadge();
    this.saveToStorage();
    
    console.log('🔔 Added notification:', notificationId, 'Total unread:', this.unreadCount);
    return notification;
  }

  /**
   * Mark a notification as read and update badge
   */
  async markAsRead(notificationId) {
    const notification = this.notifications.get(notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      
      await this.updateBadge();
      this.saveToStorage();
      
      console.log('✅ Marked notification as read:', notificationId, 'Remaining unread:', this.unreadCount);
      return true;
    }
    return false;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    let markedCount = 0;
    
    for (const [id, notification] of this.notifications) {
      if (!notification.read) {
        notification.read = true;
        markedCount++;
      }
    }
    
    this.unreadCount = 0;
    await this.updateBadge();
    this.saveToStorage();
    
    console.log('✅ Marked all notifications as read:', markedCount);
    return markedCount;
  }

  /**
   * Remove a notification completely
   */
  async removeNotification(notificationId) {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      const wasUnread = !notification.read;
      this.notifications.delete(notificationId);
      
      if (wasUnread) {
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
      
      await this.updateBadge();
      this.saveToStorage();
      
      console.log('🗑️ Removed notification:', notificationId, 'Remaining unread:', this.unreadCount);
      return true;
    }
    return false;
  }

  /**
   * Clear all notifications
   */
  async clearAll() {
    this.notifications.clear();
    this.unreadCount = 0;
    
    await this.updateBadge();
    this.saveToStorage();
    
    console.log('🧹 Cleared all notifications');
  }

  /**
   * Update the PWA badge
   */
  async updateBadge() {
    if (!this.isSupported) {
      console.log('⚠️ Badge API not supported');
      return false;
    }

    try {
      if (this.unreadCount > 0) {
        await navigator.setAppBadge(this.unreadCount);
        console.log('🔔 Badge updated:', this.unreadCount);
      } else {
        await navigator.clearAppBadge();
        console.log('🔔 Badge cleared');
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to update badge:', error);
      return false;
    }
  }

  /**
   * Get current badge count
   */
  getUnreadCount() {
    return this.unreadCount;
  }

  /**
   * Get all notifications
   */
  getAllNotifications() {
    return Array.from(this.notifications.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications() {
    return this.getAllNotifications().filter(n => !n.read);
  }

  /**
   * Get notifications by type
   */
  getNotificationsByType(type) {
    return this.getAllNotifications().filter(n => n.type === type);
  }

  /**
   * Get notification by ID
   */
  getNotification(id) {
    return this.notifications.get(id);
  }

  /**
   * Check if badge is supported
   */
  isBadgeSupported() {
    return this.isSupported;
  }

  /**
   * Get badge status
   */
  getStatus() {
    return {
      isSupported: this.isSupported,
      unreadCount: this.unreadCount,
      totalNotifications: this.notifications.size,
      unreadNotifications: this.getUnreadNotifications().length
    };
  }

  /**
   * Clean up old notifications (older than 30 days)
   */
  async cleanupOldNotifications() {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    let removedCount = 0;
    
    for (const [id, notification] of this.notifications) {
      if (notification.timestamp < thirtyDaysAgo) {
        const wasUnread = !notification.read;
        this.notifications.delete(id);
        removedCount++;
        
        if (wasUnread) {
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
      }
    }
    
    if (removedCount > 0) {
      await this.updateBadge();
      this.saveToStorage();
      console.log('🧹 Cleaned up old notifications:', removedCount);
    }
    
    return removedCount;
  }
}

// Create singleton instance
const badgeService = new BadgeService();

export default badgeService;
