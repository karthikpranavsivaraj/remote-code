import React, { useState, useEffect } from 'react';
import { notificationAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const loadNotifications = async () => {
    try {
      const response = await notificationAPI.getNotifications(user.id);
      setNotifications(response.data);
      setUnreadCount(response.data.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleRespond = async (id, action) => {
    try {
      await notificationAPI.respondToNotification(id, action);
      loadNotifications();
    } catch (error) {
      console.error('Failed to respond:', error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'project_invite': return '👥';
      case 'task_assigned': return '📋';
      case 'code_review': return '🔍';
      default: return '📢';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-3 border-b">
            <h3 className="font-bold text-black">Notifications</h3>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-3 border-b hover:bg-gray-50 ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-lg">{getIcon(notification.type)}</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      <p className="text-sm text-gray-600">{notification.message}</p>
                      <span className="text-xs text-gray-400">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                      
                      {notification.type === 'project_invite' && notification.status === 'pending' && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleRespond(notification._id, 'accepted')}
                            className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRespond(notification._id, 'denied')}
                            className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600"
                          >
                            Deny
                          </button>
                        </div>
                      )}
                      
                      {notification.type === 'task_assigned' && (
                        <button
                          onClick={() => window.open(`/project/${notification.data.projectId}`, '_blank')}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 mt-2"
                        >
                          View Task
                        </button>
                      )}
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;