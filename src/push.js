import API from './api/config';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function isPushEnabled() {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

export async function enablePush() {
  if (!pushSupported()) throw new Error('Your browser does not support notifications.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was blocked.');

  const reg = await navigator.serviceWorker.ready;
  const { data } = await API.get('/push/vapid-key/');
  if (!data.public_key) throw new Error('Push isn’t set up on the server yet.');

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.public_key),
  });

  await API.post('/push/subscribe/', sub.toJSON(), {
    headers: { 'Content-Type': 'application/json' },
  });
  return true;
}

export async function disablePush() {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    try {
      await API.post('/push/unsubscribe/', { endpoint: sub.endpoint },
        { headers: { 'Content-Type': 'application/json' } });
    } catch { /* ignore */ }
    await sub.unsubscribe();
  }
}
