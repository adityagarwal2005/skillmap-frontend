import API from './config';

export const getNotifications = () =>
  API.get('/notifications/');

export const getUnreadCount = () =>
  API.get('/notifications/unread/');

export const markAsRead = (notifId) =>
  API.post(`/notifications/${notifId}/read/`);

export const markAllAsRead = () =>
  API.post('/notifications/read-all/');