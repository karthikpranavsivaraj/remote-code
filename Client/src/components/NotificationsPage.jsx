import React, { useState, useEffect } from 'react';
import { notificationAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await notificationAPI.getNotifications(user.id);
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'project_invite': return 'bg-blue-100 text-blue-800';
      case 'task_assigned': return 'bg-green-100 text-green-800';
      case 'code_review': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="text-center py-8">Loading notifications...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>
      
      <div className="space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification._id}
            className={`p-4 rounded-lg border ${
              !notification.isRead ? 'bg-blue-50 border-blue-200' : 'bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className={`px-2 py-1 rounded text-xs ${getTypeColor(notification.type)}`}>
                    {notification.type.replace('_', ' ').toUpperCase()}
                  </span>
                  {!notification.isRead && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  )}
                </div>
                
                <h3 className="font-semibold text-gray-900 mb-1">
                  {notification.title}
                </h3>
                
                <p className="text-gray-700 mb-2">{notification.message}</p>
                
                <div className="text-sm text-gray-500">
                  {new Date(notification.createdAt).toLocaleString()}
                </div>
              </div>
              
              {!notification.isRead && (
                <button
                  onClick={() => markAsRead(notification._id)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Mark as read
                </button>
              )}
            </div>
          </div>
        ))}
        
        {notifications.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">🔔</div>
            <p>No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;