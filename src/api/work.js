import API from './config';

export const createWorkRequest = (data) =>
  API.post('/work/requests/create/', new URLSearchParams(data));

export const getMyWorkRequests = (userId) =>
  API.get(`/work/requests/user/${userId}/`);

export const getAvailableWorkRequests = (userId) =>
  API.get(`/work/requests/available/${userId}/`);

export const respondToWorkRequest = (wrId, status, message = '') =>
  API.post(`/work/requests/${wrId}/respond/`, new URLSearchParams({ status, message }));

export const getWorkRequestResponses = (wrId) =>
  API.get(`/work/requests/${wrId}/responses/`);

export const assignWorkRequest = (wrId, assigneeId) =>
  API.post(`/work/requests/${wrId}/assign/`, new URLSearchParams({ assignee_id: assigneeId }));

export const closeWorkRequest = (wrId) =>
  API.post(`/work/requests/${wrId}/close/`);

export const sendWorkProposal = (receiverId, data) =>
  API.post(`/work/proposals/send/${receiverId}/`, new URLSearchParams(data));

export const getMyProposals = () =>
  API.get('/work/proposals/mine/');

export const respondToWorkProposal = (proposalId, status) =>
  API.post(`/work/proposals/${proposalId}/respond/`, new URLSearchParams({ status }));

export const getConversations = () =>
  API.get('/conversations/');

export const sendMessage = (convId, text) =>
  API.post(`/conversations/${convId}/send/`, new URLSearchParams({ text }));

export const getMessages = (convId) =>
  API.get(`/conversations/${convId}/messages/`);