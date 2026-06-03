import API from './config';

export const login = (username, password) =>
  API.post('/users/login/', new URLSearchParams({ username, password }));

export const sendOTP = (username, email) =>
  API.post('/users/send-otp/', new URLSearchParams({ username, email }));

export const verifyAndRegister = (username, email, password, otp) =>
  API.post('/users/verify-register/', new URLSearchParams({ username, email, password, otp }));

export const refreshToken = (refresh) =>
  API.post('/users/token/refresh/', new URLSearchParams({ refresh }));


export const register = (username, email, password, latitude, longitude) =>
  API.post('/users/register/', new URLSearchParams({ 
    username, email, password,
    ...(latitude && { latitude }),
    ...(longitude && { longitude }),
  }));