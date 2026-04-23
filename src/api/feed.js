import API from './config';

export const getFeed = (params = {}) =>
  API.get('/feed/', { params });

export const searchFeed = (params = {}) =>
  API.get('/feed/search/', { params });

export const getTrending = () =>
  API.get('/feed/trending/');