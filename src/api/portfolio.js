import API from './config';

export const createPortfolioItem = (data) =>
  API.post('/portfolio/create/', new URLSearchParams(data));

export const getPortfolioItem = (userId, itemId) =>
  API.get(`/portfolio/user/${userId}/`).then(r => ({
    ...r,
    data: { item: r.data.items?.find(i => i.id === parseInt(itemId)) }
  }));

export const editPortfolioItem = (itemId, data) =>
  API.post(`/portfolio/${itemId}/edit/`, new URLSearchParams(data));

export const deletePortfolioItem = (itemId) =>
  API.delete(`/portfolio/${itemId}/delete/`);

export const addMedia = (itemId, formData) =>
  API.post(`/portfolio/${itemId}/media/add/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const reactToItem = (itemId, reactionType = 'fire') =>
  API.post(`/portfolio/${itemId}/react/`, new URLSearchParams({ reaction_type: reactionType }));

export const getComments = (itemId) =>
  API.get(`/portfolio/${itemId}/comments/`);

export const addComment = (itemId, text) =>
  API.post(`/portfolio/${itemId}/comment/`, new URLSearchParams({ text }));

export const editComment = (commentId, text) =>
  API.post(`/portfolio/comments/${commentId}/edit/`, new URLSearchParams({ text }));

export const deleteComment = (commentId) =>
  API.delete(`/portfolio/comments/${commentId}/remove/`);