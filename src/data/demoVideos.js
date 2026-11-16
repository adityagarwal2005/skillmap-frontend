// Sample clips that top up the Videos feed while real uploads are still few,
// so a new visitor never lands on an empty, dead-looking feed. They are shown
// only when there aren't enough real videos yet (see VideosPage), sit *after*
// any real clips, and disappear on their own as the real feed fills up.
//
// They are deliberately NOT real accounts or DB rows: nothing here impersonates
// a real person or inflates the network's numbers — it's app-provided sample
// content, the video equivalent of an empty-state illustration. Each `demo`
// clip is handled client-side only (its like is a local toggle, its views
// aren't counted), so it never hits the API.
//
// Clips are hosted on long-lived, reliable CDNs (Cloudinary's public demo
// cloud and test-videos.co.uk) and were confirmed to play back cleanly.
const DEMO_VIDEOS = [
  {
    id: 'demo-1',
    url: 'https://res.cloudinary.com/demo/video/upload/cld-sample-video.mp4',
    caption: 'a day-in-the-life edit for a skincare brand ✨',
    views: 142, likes: 18,
    user: { username: 'anjali.makes', category: 'Content' },
  },
  {
    id: 'demo-2',
    url: 'https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4',
    caption: 'dive resort promo — colour graded this morning',
    views: 206, likes: 24,
    user: { username: 'arjun.films', category: 'Videography' },
  },
  {
    id: 'demo-3',
    url: 'https://res.cloudinary.com/demo/video/upload/ski_jump.mp4',
    caption: 'slo-mo reel from the slopes ❄️',
    views: 173, likes: 29,
    user: { username: 'sana.motion', category: 'Sports media' },
  },
  {
    id: 'demo-4',
    url: 'https://res.cloudinary.com/demo/video/upload/snow_horses.mp4',
    caption: 'equine shoot, golden hour in the snow',
    views: 89, likes: 11,
    user: { username: 'meher.lens', category: 'Photography' },
  },
  {
    id: 'demo-5',
    url: 'https://res.cloudinary.com/demo/video/upload/dog.mp4',
    caption: 'pet reels are the best shoots 🐾',
    views: 118, likes: 21,
    user: { username: 'neha.shoots', category: 'Pet photography' },
  },
  {
    id: 'demo-6',
    url: 'https://res.cloudinary.com/demo/video/upload/elephants.mp4',
    caption: 'rough cut from the Kabini trip 🐘',
    views: 64, likes: 9,
    user: { username: 'ishan.wild', category: 'Wildlife film' },
  },
  {
    id: 'demo-7',
    url: 'https://res.cloudinary.com/demo/video/upload/outdoors.mp4',
    caption: 'landscape b-roll for a travel vlog',
    views: 51, likes: 7,
    user: { username: 'devq.visuals', category: 'Travel' },
  },
  {
    id: 'demo-8',
    url: 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4',
    caption: 'ambient loop for a meditation app',
    views: 77, likes: 13,
    user: { username: 'kabir.studio', category: 'Motion design' },
  },
].map(v => ({
  // Fill in the fields the feed expects so a demo clip renders exactly like a
  // real one.
  thumbnail: null,
  liked: false,
  created_at: null,
  demo: true,
  ...v,
  user: { id: null, avatar: null, ...v.user },
}));

export default DEMO_VIDEOS;
