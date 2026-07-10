import API from './config';

// Build FormData when a File is attached (media), else form-encoded.
const bodyFor = (data) => {
  if (data && data.media instanceof File) {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v); });
    return fd;
  }
  const { media, ...rest } = data || {};
  return new URLSearchParams(rest);
};

export const getCollabPosts = (params = {}) =>
  API.get('/collab/', { params });

export const getMyCollabPosts = () =>
  API.get('/collab/mine/');

export const createCollabPost = (data) =>
  API.post('/collab/create/', bodyFor(data));

export const applyToCollab = (postId, message = '') =>
  API.post(`/collab/${postId}/apply/`, new URLSearchParams({ message }));

export const getCollabApplicants = (postId) =>
  API.get(`/collab/${postId}/applicants/`);

export const respondToCollabRequest = (requestId, status) =>
  API.post(`/collab/requests/${requestId}/respond/`, new URLSearchParams({ status }));

export const closeCollabPost = (postId) =>
  API.post(`/collab/${postId}/close/`);