import API from './config';

// The reels-style video feed + proof-of-work clips.
export const getVideoFeed = (offset = 0, limit = 12) =>
  API.get(`/videos/?offset=${offset}&limit=${limit}`);

export const getUserVideos = (userId) => API.get(`/videos/user/${userId}/`);

export const createVideo = ({ video, caption }) => {
  const fd = new FormData();
  fd.append('video', video);
  if (caption) fd.append('caption', caption);
  return API.post('/videos/create/', fd);
};

export const likeVideo = (id) => API.post(`/videos/${id}/like/`);
export const viewVideo = (id) => API.post(`/videos/${id}/view/`);
export const deleteVideo = (id) => API.post(`/videos/${id}/delete/`);
