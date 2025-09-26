import { useState, useEffect } from 'react';
import badgeService from '../services/badgeService';

const NotificationBadge = ({ 
  className = '', 
  showCount = true, 
  maxCount = 99,
  size = 'sm' 
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if badge is supported
    setIsSupported(badgeService.isBadgeSupported());
    
    // Get initial count
    setUnreadCount(badgeService.getUnreadCount());

    // Listen for badge updates
    const handleBadgeUpdate = () => {
      setUnreadCount(badgeService.getUnreadCount());
    };

    // Listen for service worker messages
    const handleMessage = (event) => {
      if (event.data?.type === 'MARK_NOTIFICATION_READ') {
        badgeService.markAsRead(event.data.notificationId);
        handleBadgeUpdate();
      }
    };

    // Add event listeners
    window.addEventListener('badge-updated', handleBadgeUpdate);
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    // Cleanup
    return () => {
      window.removeEventListener('badge-updated', handleBadgeUpdate);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  // Don't render if not supported or no unread notifications
  if (!isSupported || unreadCount === 0) {
    return null;
  }

  const sizeClasses = {
    xs: 'w-2 h-2 text-xs',
    sm: 'w-3 h-3 text-xs',
    md: 'w-4 h-4 text-sm',
    lg: 'w-5 h-5 text-sm',
    xl: 'w-6 h-6 text-base'
  };

  const displayCount = showCount ? (unreadCount > maxCount ? `${maxCount}+` : unreadCount.toString()) : '';

  return (
    <div className={`relative ${className}`}>
      <div 
        className={`
          ${sizeClasses[size]} 
          bg-red-500 text-white 
          rounded-full 
          flex items-center justify-center 
          font-bold 
          shadow-lg
          animate-pulse
        `}
        title={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
      >
        {displayCount}
      </div>
    </div>
  );
};

export default NotificationBadge;

