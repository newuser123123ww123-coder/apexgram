/*
 * CUSTOM: a photo chosen by the user ("Set as wallpaper") replaces the default chat wallpapers.
 *
 * The photo is kept in its own tiny IndexedDB database (as a Blob), so it survives a page reload
 * and can not break any other storage of the app. The photo itself is shown by one extra layer
 * that lies over the standard background layer, so the standard wallpaper code stays untouched.
 */

const DB_NAME = 'tweb-custom-wallpaper';
const STORE_NAME = 'wallpaper';
const RECORD_KEY = 'current';

let overlay: HTMLDivElement;
let objectUrl: string;
let active = false;

const listeners = new Set<(active: boolean) => void>();

let dbPromise: Promise<IDBDatabase>;
function openDatabase() {
  if(dbPromise) {
    return dbPromise;
  }

  return dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => {
      const db = request.result;
      db.onclose = () => {
        dbPromise = undefined;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = undefined;
      reject(request.error);
    };
  });
}

function runTransaction<T>(mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<T>) {
  return openDatabase().then((db) => new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = callback(transaction.objectStore(STORE_NAME));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  }));
}

function createOverlay() {
  const element = document.createElement('div');
  element.classList.add('custom-wallpaper');
  element.setAttribute('aria-hidden', 'true');
  element.style.cssText = [
    'position:absolute',
    'inset:0',
    'overflow:hidden',
    'pointer-events:none',
    'background-size:cover',
    'background-position:center',
    'background-repeat:no-repeat',
    'display:none'
  ].join(';');
  return element;
}

function setActive(value: boolean) {
  active = value;
  listeners.forEach((listener) => listener(active));
}

function showBlob(blob: Blob) {
  if(!overlay) {
    return;
  }

  const previousUrl = objectUrl;
  objectUrl = URL.createObjectURL(blob);
  overlay.style.backgroundImage = `url("${objectUrl}")`;
  overlay.style.display = '';
  if(previousUrl) {
    URL.revokeObjectURL(previousUrl);
  }

  setActive(true);
}

export function hasCustomWallpaper() {
  return active;
}

/** Calls the listener each time the wallpaper is set or reset. Returns the unsubscribe function. */
export function onCustomWallpaperChange(listener: (active: boolean) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Creates the layer inside `parent` (it must be called right after the standard background layer
 * was mounted there, so the new layer lies over it) and shows the saved photo, if there is one.
 */
export async function initCustomWallpaper(parent: HTMLElement) {
  if(!overlay) {
    overlay = createOverlay();
  }

  if(overlay.parentElement !== parent) {
    parent.append(overlay);
  }

  try {
    const blob = await runTransaction<Blob>('readonly', (store) => store.get(RECORD_KEY));
    if(blob && !active) {
      showBlob(blob);
    }
  } catch(err) {
    console.warn('[custom-wallpaper] can not load the saved photo', err);
  }
}

export async function setCustomWallpaper(blob: Blob) {
  showBlob(blob);

  try {
    await runTransaction('readwrite', (store) => store.put(blob, RECORD_KEY));
  } catch(err) {
    // * the photo is already shown, it just will not survive a reload
    console.warn('[custom-wallpaper] can not save the photo', err);
  }
}

export async function resetCustomWallpaper() {
  if(overlay) {
    overlay.style.display = 'none';
    overlay.style.backgroundImage = '';
  }

  if(objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = undefined;
  }

  setActive(false);

  try {
    await runTransaction('readwrite', (store) => store.delete(RECORD_KEY));
  } catch(err) {
    console.warn('[custom-wallpaper] can not delete the saved photo', err);
  }
}
