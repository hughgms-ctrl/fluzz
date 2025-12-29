// Push notification handlers - imported by the main PWA service worker
// This file is included via workbox importScripts

self.addEventListener('push', function(event) {
  console.log('[SW Push] Push Received.');
  console.log('[SW Push] Push data:', event.data ? event.data.text() : 'no data');
  
  let data = {
    title: 'Fluzz',
    body: 'Você tem uma nova notificação',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: 'fluzz-notification',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[SW Push] Parsed payload:', JSON.stringify(payload));
      data = {
        ...data,
        ...payload
      };
    } catch (e) {
      console.error('[SW Push] Error parsing push data:', e);
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.png',
    badge: data.badge || '/favicon.png',
    tag: data.tag || 'fluzz-notification',
    vibrate: [200, 100, 200, 100, 200],
    data: data.data || { url: '/' },
    actions: data.actions || [],
    requireInteraction: data.requireInteraction !== false,
    silent: false,
    renotify: true
  };

  console.log('[SW Push] Showing notification:', data.title, options);

  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => console.log('[SW Push] Notification shown successfully'))
      .catch(err => console.error('[SW Push] Error showing notification:', err))
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[SW Push] Notification click received.');
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('[SW Push] Notification closed.');
});

// Handle messages from the main thread
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});

console.log('[SW Push] Push handlers loaded');
