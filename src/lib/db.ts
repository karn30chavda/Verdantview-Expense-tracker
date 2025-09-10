'use client';

import type { Expense, Category, Reminder, AppSettings } from './types';

const DB_NAME = 'VerdantViewDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject('IndexedDB not available');
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
        
        // Populate default categories and settings if first time
        const transaction = db.transaction(['categories', 'settings'], 'readwrite');
        const categoryStore = transaction.objectStore('categories');
        const settingsStore = transaction.objectStore('settings');

        categoryStore.count().onsuccess = (e) => {
            const count = (e.target as IDBRequest).result;
            if (count === 0) {
                const defaultCategories = ['Groceries', 'Dining', 'Travel', 'Utilities', 'Shopping', 'Other'];
                defaultCategories.forEach(name => categoryStore.add({ name }));
            }
        };

        settingsStore.count().onsuccess = (e) => {
            const count = (e.target as IDBRequest).result;
            if (count === 0) {
                settingsStore.add({ id: 1, monthlyBudget: 1000 });
            }
        };
        
        resolve(db);
      };
    });
  }
  return dbPromise;
}

// Generic CRUD operations
async function performDBOperation<T>(storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
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
export const addCategory = (category: {name: string}): Promise<IDBValidKey> => performDBOperation('categories', 'readwrite', store => store.add(category));
export const deleteCategory = (id: number): Promise<void> => performDBOperation('categories', 'readwrite', store => store.delete(id));

// Reminders
export const getReminders = (): Promise<Reminder[]> => performDBOperation('reminders', 'readonly', store => store.getAll());
export const addReminder = (reminder: Omit<Reminder, 'id'>): Promise<IDBValidKey> => performDBOperation('reminders', 'readwrite', store => store.add(reminder));
export const deleteReminder = (id: number): Promise<void> => performDBOperation('reminders', 'readwrite', store => store.delete(id));

// Settings
export const getSettings = (): Promise<AppSettings> => performDBOperation('settings', 'readonly', store => store.get(1));
export const updateSettings = (settings: AppSettings): Promise<IDBValidKey> => performDBOperation('settings', 'readwrite', store => store.put({ ...settings, id: 1 }));

// Data Management
export const exportData = async () => {
    const expenses = await getExpenses();
    const categories = await getCategories();
    const reminders = await getReminders();
    const settings = await getSettings();
    return { expenses, categories, reminders, settings };
};

export const importData = async (data: { expenses: Expense[], categories: Category[], reminders: Reminder[], settings: AppSettings }) => {
    const db = await getDB();
    const tx = db.transaction(['expenses', 'categories', 'reminders', 'settings'], 'readwrite');
    tx.objectStore('expenses').clear();
    tx.objectStore('categories').clear();
    tx.objectStore('reminders').clear();
    
    data.expenses.forEach(e => tx.objectStore('expenses').add(e));
    data.categories.forEach(c => tx.objectStore('categories').add(c));
    data.reminders.forEach(r => tx.objectStore('reminders').add(r));
    tx.objectStore('settings').put(data.settings);
    
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
};

export const clearAllData = async () => {
    const db = await getDB();
    const tx = db.transaction(['expenses', 'categories', 'reminders', 'settings'], 'readwrite');
    tx.objectStore('expenses').clear();
    tx.objectStore('categories').clear();
    tx.objectStore('reminders').clear();
    tx.objectStore('settings').clear();

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => {
             // Re-populate default categories and settings after clearing
            const populateTx = db.transaction(['categories', 'settings'], 'readwrite');
            const categoryStore = populateTx.objectStore('categories');
            const settingsStore = populateTx.objectStore('settings');
            const defaultCategories = ['Groceries', 'Dining', 'Travel', 'Utilities', 'Shopping', 'Other'];
            defaultCategories.forEach(name => categoryStore.add({ name }));
            settingsStore.add({ id: 1, monthlyBudget: 1000 });
            
            populateTx.oncomplete = () => resolve(true);
            populateTx.onerror = () => reject(populateTx.error);
        };
        tx.onerror = () => reject(tx.error);
    });
};
