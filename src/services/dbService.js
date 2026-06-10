/**
 * dbService.js
 * IndexedDB wrapper — persists headshot and video blobs across sessions.
 * All functions are promise-based and fail gracefully.
 */

const DB_NAME    = 'scout-ai';
const DB_VERSION = 1;
const BLOB_STORE = 'blobs'; // single object store, keyed by "<profileId>-headshot" / "<profileId>-video"

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE);
      }
    };
    req.onsuccess  = e => { _db = e.target.result; resolve(_db); };
    req.onerror    = e => reject(e.target.error);
    req.onblocked  = ()  => reject(new Error('IndexedDB blocked'));
  });
}

export async function storeBlob(key, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readwrite');
    tx.objectStore(BLOB_STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror    = e => reject(e.target.error);
  });
}

export async function getBlob(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(BLOB_STORE, 'readonly');
    const req = tx.objectStore(BLOB_STORE).get(key);
    req.onsuccess = e => resolve(e.target.result ?? null);
    req.onerror   = e => reject(e.target.error);
  });
}

export async function deleteBlob(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readwrite');
    tx.objectStore(BLOB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror    = e => reject(e.target.error);
  });
}

export async function clearAllBlobs() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readwrite');
    tx.objectStore(BLOB_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror    = e => reject(e.target.error);
  });
}
