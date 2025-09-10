self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_REMINDER') {
    const { title, date, tag } = event.data.payload;
    const dueDate = new Date(date);
    const now = new Date();

    // Notification for right now (for testing)
    if (Notification.permission === 'granted') {
         self.registration.showNotification('Reminder Set!', {
            body: `You will be reminded about "${title}" on ${dueDate.toLocaleDateString()}.`,
            icon: '/icons/icon-192x192.png',
            tag: `test-${tag}`
        });
    }

    // Schedule for 1 day before
    const oneDayBefore = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
    if (oneDayBefore > now) {
      scheduleNotification(oneDayBefore, `Reminder: ${title}`, `Your payment for "${title}" is due tomorrow.`, `reminder-1day-${tag}`);
    }

    // Schedule for the due date
    if (dueDate > now) {
      scheduleNotification(dueDate, `Reminder Due: ${title}`, `Your payment for "${title}" is due today.`, `reminder-today-${tag}`);
    }
  }
});

function scheduleNotification(scheduledTime, title, body, tag) {
  const delay = scheduledTime.getTime() - new Date().getTime();
  if (delay > 0) {
    setTimeout(() => {
      if (Notification.permission === 'granted') {
        self.registration.showNotification(title, {
          body: body,
          icon: '/icons/icon-192x192.png',
          tag: tag,
        });
      }
    }, delay);
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/reminders')
  );
});
