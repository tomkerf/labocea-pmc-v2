// Service Worker pour les Notifications Push — Labocea PMC V2
// Reçoit les notifications push FCM en arrière-plan et gère les clics.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    console.log('[Service Worker] Notification reçue :', payload);

    // Extraction des données de la notification FCM (HTTP v1)
    // FCM encapsule souvent dans "notification" ou directement dans "data"
    const notification = payload.notification || {};
    const data = payload.data || {};

    const title = notification.title || data.title || 'Labocea PMC';
    const body = notification.body || data.body || '';
    const icon = notification.icon || '/logo.png';
    const badge = '/logo.png';

    const options = {
      body,
      icon,
      badge,
      data: {
        url: data.url || '/',
        ...data
      },
      vibrate: [100, 50, 100],
      actions: [
        { action: 'open', title: 'Ouvrir l\'application' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.error('[Service Worker] Erreur lors du parsing de la notification push :', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // URL par défaut à ouvrir au clic
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si un onglet de l'app est déjà ouvert, on fait le focus dessus et on navigue
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => {
            if (client.navigate) {
              return client.navigate(targetUrl);
            }
          });
        }
      }
      // Sinon, on ouvre une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
