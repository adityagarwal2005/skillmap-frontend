import API from './config';

export const login = (username, password) =>
  API.post('/users/login/', new URLSearchParams({ username, password }));

export const googleLogin = (credential, latitude, longitude, referredBy) =>
  API.post('/users/login/google/', new URLSearchParams({
    credential,
    ...(latitude && { latitude }),
    ...(longitude && { longitude }),
    ...(referredBy && { referred_by: referredBy }),
  }));

export const sendOTP = (username, email) =>
  API.post('/users/send-otp/', new URLSearchParams({ username, email }));

// Passwordless login: send a code to an existing account, then verify it.
export const sendLoginOTP = (email) =>
  API.post('/users/login/send-otp/', new URLSearchParams({ email }));

export const verifyLoginOTP = (email, otp) =>
  API.post('/users/login/verify-otp/', new URLSearchParams({ email, otp }));

// Forgot password: reuses sendLoginOTP to email the code, then this sets
// the new password directly once the code checks out.
export const resetPasswordWithOTP = (email, otp, newPassword) =>
  API.post('/users/password/reset/', new URLSearchParams({ email, otp, new_password: newPassword }));



export const verifyAndRegister = (username, email, password, otp, latitude, longitude, referredBy) =>
  API.post('/users/verify-register/', new URLSearchParams({
    username, email, password, otp,
    ...(latitude && { latitude }),
    ...(longitude && { longitude }),
    ...(referredBy && { referred_by: referredBy }),
  }));

  
export const refreshToken = (refresh) =>
  API.post('/users/token/refresh/', new URLSearchParams({ refresh }));


export const register = (username, email, password, latitude, longitude) =>
  API.post('/users/register/', new URLSearchParams({ 
    username, email, password,
    ...(latitude && { latitude }),
    ...(longitude && { longitude }),
  }));