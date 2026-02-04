/**
 * Database Module (IndexedDB Wrapper)
 * Handles offline storage for Users, Attendance, and Sync Queue.
 * (Converted to IIFE for file:// support)
 */
(function () {
    const DB_NAME = 'crwi_attendance_db';
    const DB_VERSION = 3; // Bumped to force store creation if missing

    class Database {
        constructor() {
            this.db = null;
        }

        async init() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);

                request.onerror = (event) => {
                    console.error("Database error: " + event.target.errorCode);
                    reject(event.target.error);
                };

                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    console.log("Database initialized");
                    resolve(this.db);
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;

                    // Users Store (key: id)
                    if (!db.objectStoreNames.contains('users')) {
                        const usersStore = db.createObjectStore('users', { keyPath: 'id' });
                        usersStore.createIndex('username', 'username', { unique: true });
                    }

                    // Attendance Store (key: id)
                    if (!db.objectStoreNames.contains('attendance')) {
                        const attStore = db.createObjectStore('attendance', { keyPath: 'id' });
                        attStore.createIndex('user_id', 'user_id', { unique: false });
                        attStore.createIndex('date', 'date', { unique: false });
                        attStore.createIndex('synced', 'synced', { unique: false });
                    }

                    // Sync Queue (key: id)
                    if (!db.objectStoreNames.contains('sync_queue')) {
                        const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
                    }

                    // Leaves Store (key: id)
                    if (!db.objectStoreNames.contains('leaves')) {
                        const leaveStore = db.createObjectStore('leaves', { keyPath: 'id' });
                        leaveStore.createIndex('userId', 'userId', { unique: false });
                        leaveStore.createIndex('status', 'status', { unique: false });
                    }
                };
            });
        }

        async getAll(storeName) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        async get(storeName, key) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.get(key);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        async add(storeName, item) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.add(item);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        async put(storeName, item) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.put(item);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        async delete(storeName, key) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(key);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }

        async clear(storeName) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
    }

    // Export to Window (Global)
    window.AppDB = new Database();
})();
