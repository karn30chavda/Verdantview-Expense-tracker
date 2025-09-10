'use client';

import type { Expense, Category, Reminder, AppSettings } from './types';

const DB_NAME = 'VerdantViewDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

const defaultCategories = ['Groceries', 'Dining', 'Travel', 'Utilities', 'Shopping', 'Other'];

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    // This is a client-side only library
    return Promise.reject(new Error('IndexedDB not available on server-side.'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject('Error opening database');
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('expenses')) {
          const expenseStore = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
          expenseStore.createIndex('date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains('categories')) {
          const catStore = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
          catStore.createIndex('name', 'name', { unique: true });
        }
        if (!db.objectStoreNames.contains('reminders')) {
          db.createObjectStore('reminders', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Use a separate function to handle initial data population
        populateInitialData(db).then(() => resolve(db)).catch(reject);
      };
    });
  }
  return dbPromise;
}

async function populateInitialData(db: IDBDatabase): Promise<void> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['categories', 'settings'], 'readwrite');
        const categoryStore = transaction.objectStore('categories');
        const settingsStore = transaction.objectStore('settings');
        let checksCompleted = 0;

        const onComplete = () => {
            checksCompleted++;
            if (checksCompleted === 2) {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            }
        };

        const catRequest = categoryStore.count();
        catRequest.onsuccess = (e) => {
            const count = (e.target as IDBRequest).result;
            if (count === 0) {
                defaultCategories.forEach(name => categoryStore.add({ name }));
            }
            onComplete();
        };
        catRequest.onerror = () => reject(catRequest.error);
        

        const settingsRequest = settingsStore.count();
        settingsRequest.onsuccess = (e) => {
            const count = (e.target as IDBRequest).result;
            if (count === 0) {
                settingsStore.add({ id: 1, monthlyBudget: 1000 });
            }
            onComplete();
        };
        settingsRequest.onerror = () => reject(settingsRequest.error);
    });
}


// Generic CRUD operations
async function performDBOperation<T>(storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest | IDBRequest<any[]>): Promise<T> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Expenses
export const getExpenses = (): Promise<Expense[]> => performDBOperation('expenses', 'readonly', store => store.getAll());
export const addExpense = (expense: Omit<Expense, 'id'>): Promise<IDBValidKey> => performDBOperation('expenses', 'readwrite', store => store.add(expense));
export const updateExpense = (expense: Expense): Promise<IDBValidKey> => performDBOperation('expenses', 'readwrite', store => store.put(expense));
export const deleteExpense = (id: number): Promise<void> => performDBOperation('expenses', 'readwrite', store => store.delete(id));

// Categories
export const getCategories = (): Promise<Category[]> => performDBOperation('categories', 'readonly', store => store.getAll());
export const addCategory = (category: Omit<Category, 'id'>): Promise<IDBValidKey> => performDBOperation('categories', 'readwrite', store => store.add(category));
export const deleteCategory = async (id: number): Promise<void> => {
    const db = await getDB();
    const tx = db.transaction('categories', 'readwrite');
    const store = tx.objectStore('categories');

    return new Promise((resolve, reject) => {
        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
            const categoryToDelete = getRequest.result;
            if (categoryToDelete && defaultCategories.includes(categoryToDelete.name)) {
                // We double-check here, but primary logic is in the UI
                reject(new Error('Cannot delete a default category.'));
                return;
            }
            const deleteRequest = store.delete(id);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
};


// Reminders
export const getReminders = (): Promise<Reminder[]> => performDBOperation('reminders', 'readonly', store => store.getAll());
export const addReminder = (reminder: Omit<Reminder, 'id'>): Promise<IDBValidKey> => performDBOperation('reminders', 'readwrite', store => store.add(reminder));
export const deleteReminder = (id: number): Promise<void> => performDBOperation('reminders', 'readwrite', store => store.delete(id));

// Settings
export const getSettings = (): Promise<AppSettings> => performDBOperation('settings', 'readonly', store => store.get(1));
export const updateSettings = (settings: Partial<AppSettings>): Promise<IDBValidKey> => performDBOperation('settings', 'readwrite', store => store.put({ ...settings, id: 1 }));

// Data Management
export const exportData = async () => {
    const expenses = await getExpenses();
    const categories = await getCategories();
    const reminders = await getReminders();
    const settings = await getSettings();
    return { expenses, categories, reminders, settings };
};

export const importData = async (data: { expenses?: Expense[], categories?: Category[], reminders?: Reminder[], settings?: AppSettings }) => {
    const db = await getDB();
    const storeNames: IDBObjectStoreNames[] = ['expenses', 'categories', 'reminders', 'settings'];
    const tx = db.transaction(storeNames, 'readwrite');
    
    const promises: Promise<any>[] = [];

    if (data.expenses) {
        const store = tx.objectStore('expenses');
        promises.push(new Promise<void>(res => store.clear().onsuccess = () => res()));
        data.expenses.forEach(e => {
            const { id, ...rest } = e; // Explicitly remove id
            promises.push(new Promise<void>(res => store.add(rest).onsuccess = () => res()));
        });
    }

    if (data.categories) {
        const store = tx.objectStore('categories');
        promises.push(new Promise<void>(res => store.clear().onsuccess = () => res()));
        defaultCategories.forEach(name => {
            promises.push(new Promise<void>(res => store.add({ name }).onsuccess = () => res()));
        });
        const defaultCatSet = new Set(defaultCategories);
        data.categories.forEach(c => {
            if (!defaultCatSet.has(c.name)) {
                const { id, ...rest } = c; // Explicitly remove id
                promises.push(new Promise<void>(res => store.add(rest).onsuccess = () => res()));
            }
        });
    }

    if (data.reminders) {
        const store = tx.objectStore('reminders');
        promises.push(new Promise<void>(res => store.clear().onsuccess = () => res()));
        data.reminders.forEach(r => {
            const { id, ...rest } = r; // Explicitly remove id
            promises.push(new Promise<void>(res => store.add(rest).onsuccess = () => res()));
        });
    }
   
    if (data.settings) {
        // Settings store isn't cleared, it's just updated.
        const store = tx.objectStore('settings');
        promises.push(new Promise<void>(res => store.put(data.settings).onsuccess = () => res()));
    }
    
    return new Promise<void>((resolve, reject) => {
        Promise.all(promises).then(() => {
            tx.oncomplete = () => resolve();
        }).catch(reject);
        tx.onerror = () => reject(tx.error);
    });
};

export const clearAllData = async () => {
    const db = await getDB();
    const storeNames: IDBObjectStoreNames[] = ['expenses', 'categories', 'reminders', 'settings'];
    const tx = db.transaction(storeNames, 'readwrite');

    for (const storeName of storeNames) {
        tx.objectStore(storeName).clear();
    }

    return new Promise<void>((resolve, reject) => {
        tx.oncomplete = async () => {
            try {
                await populateInitialData(db);
                resolve();
            } catch (error) {
                reject(error);
            }
        };
        tx.onerror = () => reject(tx.error);
    });
};
