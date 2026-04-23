import API from './config';

export const getUser = (userId) =>
  API.get(`/users/${userId}/`);

export const editUser = (userId, data) =>
  API.post(`/users/${userId}/edit/`, new URLSearchParams(data));

export const deleteUser = (userId) =>
  API.delete(`/users/${userId}/delete/`);

export const updateStatus = (status) =>
  API.post('/users/status/update/', new URLSearchParams({ status }));

export const searchUsers = (params) =>
  API.get('/users/search/', { params });

export const getCategories = () =>
  API.get('/categories/');

export const getCategorySkills = (categoryId) =>
  API.get(`/categories/${categoryId}/skills/`);

export const addSkill = (userId, skill) =>
  API.post(`/users/${userId}/skills/add/`, new URLSearchParams({ skill }));

export const removeSkill = (userId, skill) =>
  API.delete(`/users/${userId}/skills/remove/`, { data: new URLSearchParams({ skill }) });

export const getUserPortfolio = (userId, params = {}) =>
  API.get(`/portfolio/user/${userId}/`, { params });

export const getUserCertificates = (userId) =>
  API.get(`/users/${userId}/certificates/`);

export const addCertificate = (formData) =>
  API.post('/certificates/add/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const removeCertificate = (certId) =>
  API.delete(`/certificates/${certId}/remove/`);

export const getUserReviews = (userId) =>
  API.get(`/reviews/user/${userId}/`);

export const addReview = (revieweeId, data) =>
  API.post(`/reviews/user/${revieweeId}/add/`, new URLSearchParams(data));