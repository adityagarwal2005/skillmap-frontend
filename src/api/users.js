import API from './config';

export const getUser = (userId) =>
  API.get(`/users/${userId}/`);

// Public — no auth required. Powers the shareable /u/:username profile page.
export const getUserByUsername = (username) =>
  API.get(`/users/by-username/${encodeURIComponent(username)}/`);

export const editUser = (userId, data) =>
  API.post(`/users/${userId}/edit/`, new URLSearchParams(data));

export const changePassword = (userId, currentPassword, newPassword) =>
  API.post(`/users/${userId}/change-password/`, new URLSearchParams({
    current_password: currentPassword,
    new_password: newPassword,
  }));

export const uploadAvatar = (userId, file) => {
  const fd = new FormData();
  fd.append('profile_image', file);
  return API.post(`/users/${userId}/edit/`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deleteUser = (userId) =>
  API.delete(`/users/${userId}/delete/`);

export const blockUser = (userId) =>
  API.post(`/users/${userId}/block/`);

export const unblockUser = (userId) =>
  API.post(`/users/${userId}/unblock/`);

export const getBlockedUsers = () =>
  API.get('/users/blocked/');

export const reportContent = (reportType, targetId, reason, details = '') =>
  API.post('/reports/create/', new URLSearchParams({
    report_type: reportType, target_id: targetId, reason, details,
  }));

export const updateStatus = (status) =>
  API.post('/users/status/update/', new URLSearchParams({ status }));

export const sendPhoneOTP = (phone) =>
  API.post('/users/phone/send-otp/', new URLSearchParams({ phone }));

export const verifyPhoneOTP = (phone, otp) =>
  API.post('/users/phone/verify-otp/', new URLSearchParams({ phone, otp }));

export const searchUsers = (params) =>
  API.get('/users/search/', { params });

export const getMyReferrals = () =>
  API.get('/users/referrals/');

export const endorseSkill = (userId, skill) =>
  API.post(`/users/${userId}/endorse/`, new URLSearchParams({ skill }));

// ── Friends ──
export const sendFriendRequest = (userId) =>
  API.post(`/users/${userId}/friend/`);

export const respondFriendRequest = (userId, action) => // action: 'accept' | 'reject'
  API.post(`/users/${userId}/friend/respond/`, new URLSearchParams({ action }));

export const removeFriend = (userId) =>
  API.post(`/users/${userId}/friend/remove/`);

export const getFriendRequests = () =>
  API.get('/users/friend-requests/');

export const getCategories = () =>
  API.get('/categories/');

export const addSkill = (userId, skill) =>
  API.post(`/users/${userId}/skills/add/`, new URLSearchParams({ skill }));

export const removeSkill = (userId, skill) =>
  API.delete(`/users/${userId}/skills/remove/`, { data: new URLSearchParams({ skill }) });

export const getUserPortfolio = (userId, params = {}) =>
  API.get(`/portfolio/user/${userId}/`, { params });

export const addReview = (revieweeId, data) =>
  API.post(`/reviews/user/${revieweeId}/add/`, new URLSearchParams(data));
