/* Cardio Link service worker: notifikasi push + cadangan offline sederhana */
const CACHE = 'cardiolink-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));

/* Halaman utama: ambil dari jaringan dulu, pakai salinan terakhir bila offline */
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || r.mode !== 'navigate') return;
  e.respondWith(
    fetch(r).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put('./', copy));
      return res;
    }).catch(() => caches.match('./').then(x => x || Response.error()))
  );
});

/* Notifikasi masuk (tanpa data pasien: isi dibuat umum oleh server) */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data.json(); } catch (_) { d = { title: 'Cardio Link', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Cardio Link', {
    body: d.body || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/badge.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    requireInteraction: !!d.urgent,
    vibrate: d.urgent ? [300, 100, 300, 100, 300] : [120],
    data: { url: d.url || './' }
  }));
});

/* Ketuk notifikasi: fokus ke aplikasi yang sudah terbuka, atau buka baru */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if (c.url.startsWith(self.registration.scope) && 'focus' in c) { c.postMessage({ open: url }); return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
