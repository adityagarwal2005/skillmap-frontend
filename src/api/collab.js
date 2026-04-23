import API from './config';

export const getCollabPosts = (params = {}) =>
  API.get('/collab/', { params });

export const getMyCollabPosts = () =>
  API.get('/collab/mine/');

export const createCollabPost = (data) =>
  API.post('/collab/create/', new URLSearchParams(data));

export const applyToCollab = (postId, message = '') =>
  API.post(`/collab/${postId}/apply/`, new URLSearchParams({ message }));

export const getCollabApplicants = (postId) =>
  API.get(`/collab/${postId}/applicants/`);

export const respondToCollabRequest = (requestId, status) =>
  API.post(`/collab/requests/${requestId}/respond/`, new URLSearchParams({ status }));

export const closeCollabPost = (postId) =>
  API.post(`/collab/${postId}/close/`);