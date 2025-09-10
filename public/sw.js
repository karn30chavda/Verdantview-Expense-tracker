'use strict';

const DB_NAME = 'VerdantViewDB';
const DB_VERSION = 1;
const REMINDERS_STORE = 'reminders';
const SENT_NOTIFICATIONS_STORE = 'sentNotifications';

function getDB() {
  return new Promise((resolve, reject) => {
    const request = self.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject("Error opening database");
    request.onsuccess = (event) => resolve(event.target.result);
    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(SENT_NOTIFICATIONS_STORE)) {
            db.createObjectStore(SENT_NOTIFICATIONS_STORE, { keyPath: 'id' });
        }
    };
  });
}

async function getReminders() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REMINDERS_STORE, 'readonly');
    const store = transaction.objectStore(REMINDERS_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function hasNotificationBeenSent(reminderId) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SENT_NOTIFICATIONS_STORE, 'readonly');
        const store = transaction.objectStore(SENT_NOTIFICATIONS_STORE);
        const request = store.get(reminderId);
        request.onsuccess = () => resolve(!!request.result);
        request.onerror = () => reject(request.error);
    });
}

async function markNotificationAsSent(reminderId) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SENT_NOTIFICATIONS_STORE, 'readwrite');
        const store = transaction.objectStore(SENT_NOTIFICATIONS_STORE);
        const request = store.put({ id: reminderId, sentAt: new Date().toISOString() });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}


async function checkReminders() {
  console.log('Checking for reminders...');
  try {
    const reminders = await getReminders();
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);

    for (const reminder of reminders) {
      const dueDate = new Date(reminder.date);
      const reminderId = `reminder-${reminder.id}`;

      const isDueToday = dueDate.getFullYear() === now.getFullYear() &&
                         dueDate.getMonth() === now.getMonth() &&
                         dueDate.getDate() === now.getDate();

      const isDueTomorrow = dueDate.getFullYear() === tomorrow.getFullYear() &&
                            dueDate.getMonth() === tomorrow.getMonth() &&
                            dueDate.getDate() === tomorrow.getDate();

      if (isDueToday || isDueTomorrow) {
        const alreadySent = await hasNotificationBeenSent(reminderId);
        if (!alreadySent) {
          const dueText = isDueToday ? 'is due today' : 'is due tomorrow';
          console.log(`Sending notification for: ${reminder.title}`);
          await self.registration.showNotification('Upcoming Bill Reminder', {
            body: `'${reminder.title}' ${dueText}.`,
            icon: '/icons/icon-192x192.png'
          });
          await markNotificationAsSent(reminderId);
        }
      }
    }
  } catch (error) {
    console.error('Failed to check reminders:', error);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Use periodic sync for browsers that support it
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkReminders());
  }
});

// Fallback for browsers that don't support periodic sync
self.addEventListener('fetch', (event) => {
  // This is not a reliable way to trigger checks, but it's a fallback.
  // A better approach would be to use push notifications from a server.
  // For this client-only app, we'll check on activation.
});

// Run on activation
self.addEventListener('activate', event => {
    event.waitUntil(checkReminders());
});
