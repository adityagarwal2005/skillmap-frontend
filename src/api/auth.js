import API from './config';

export const login = (username, password) =>
  API.post('/users/login/', new URLSearchParams({ username, password }));

export const register = (username, email, password) =>
  API.post('/users/register/', new URLSearchParams({ username, email, password }));

export const refreshToken = (refresh) =>
  API.post('/users/token/refresh/', new URLSearchParams({ refresh }));