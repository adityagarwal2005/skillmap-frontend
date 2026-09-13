import API from './config';

export const getFeed = (params = {}) =>
  API.get('/feed/', { params });

