import API from './config';

export const login = (username, password) =>
  API.post('/users/login/', new URLSearchParams({ username, password }));

export const sendOTP = (username, email) =>
  API.post('/users/send-otp/', new URLSearchParams({ username, email }));

// Passwordless login: send a code to an existing account, then verify it.
export const sendLoginOTP = (email) =>
  API.post('/users/login/send-otp/', new URLSearchParams({ email }));

export const verifyLoginOTP = (email, otp) =>
  API.post('/users/login/verify-otp/', new URLSearchParams({ email, otp }));



export const verifyAndRegister = (username, email, password, otp, latitude, longitude) =>
  API.post('/users/verify-register/', new URLSearchParams({
    username, email, password, otp,
    ...(latitude && { latitude }),
    ...(longitude && { longitude }),
  }));

  
export const refreshToken = (refresh) =>
  API.post('/users/token/refresh/', new URLSearchParams({ refresh }));


export const register = (username, email, password, latitude, longitude) =>
  API.post('/users/register/', new URLSearchParams({ 
    username, email, password,
    ...(latitude && { latitude }),
    ...(longitude && { longitude }),
  }));