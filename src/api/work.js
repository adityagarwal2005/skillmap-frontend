import API from './config';

const bodyFor = (data) => {
  if (data && data.media instanceof File) {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v); });
    return fd;
  }
  const { media, ...rest } = data || {};
  return new URLSearchParams(rest);
};

export const createWorkRequest = (data) =>
  API.post('/work/requests/create/', bodyFor(data));

export const getMyWorkRequests = (userId) =>
  API.get(`/work/requests/user/${userId}/`);

export const respondToWorkRequest = (wrId, status, message = '') =>
  API.post(`/work/requests/${wrId}/respond/`, new URLSearchParams({ status, message }));

export const getWorkRequestResponses = (wrId) =>
  API.get(`/work/requests/${wrId}/responses/`);

export const assignWorkRequest = (wrId, assigneeId) =>
  API.post(`/work/requests/${wrId}/assign/`, new URLSearchParams({ assignee_id: assigneeId }));

export const rejectWorkApplicant = (wrId, applicantId) =>
  API.post(`/work/requests/${wrId}/reject/`, new URLSearchParams({ applicant_id: applicantId }));

// Close early — stops it showing to anyone before its visibility window ends.
export const closeWorkRequest = (wrId) =>
  API.post(`/work/requests/${wrId}/close/`);

export const completeWorkRequest = (wrId) =>
  API.post(`/work/requests/${wrId}/complete/`);

export const getMyApplications = () =>
  API.get('/my-applications/');

export const getConversations = () =>
  API.get('/conversations/');

export const startConversation = (userId) =>
  API.post(`/conversations/start/${userId}/`);

export const sendMessage = (convId, text, media) => {
  const fd = new FormData();
  fd.append('text', text || '');
  if (media) fd.append('media', media);
  return API.post(`/conversations/${convId}/send/`, fd);
};

export const getMessages = (convId) =>
  API.get(`/conversations/${convId}/messages/`);

export const setTyping = (convId) =>
  API.post(`/conversations/${convId}/typing/`);
