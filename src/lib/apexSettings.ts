/*
 * CUSTOM: the switches of the ApexGram features (see the "ApexGram" tab in the settings).
 *
 * The page keeps them in localStorage (so they can be read at once, when the page starts).
 * The worker, which keeps the deleted messages, has no localStorage, so the same values are
 * also kept in its own tiny IndexedDB database, and the page tells the worker about a change.
 * Every function is best-effort: on any error the feature just stays turned on.
 */

export type ApexSettingKey = 'keepDeleted' | 'readButtons' | 'wallpaper' | 'star' | 'emptyLogo';
export type ApexSettings = Record<ApexSettingKey, boolean>;

export const APEX_SETTING_KEYS: ApexSettingKey[] = ['keepDeleted', 'readButtons', 'wallpaper', 'star', 'emptyLogo'];

const STORAGE_KEY = 'apexgram-settings';
const DB_NAME = 'tweb-apexgram-settings';
const STORE_NAME = 'settings';
const RECORD_KEY = 'all';

const settings: ApexSettings = {
  keepDeleted: true,
  readButtons: true,
  wallpaper: true,
  star: true,
  emptyLogo: true
};

function merge(saved: any) {
  if(!saved || typeof(saved) !== 'object') {
    return;
  }

  APEX_SETTING_KEYS.forEach((key) => {
    if(typeof(saved[key]) === 'boolean') {
      settings[key] = saved[key];
    }
  });
}

// * the page: read what was saved
try {
  if(typeof(localStorage) !== 'undefined') {
    merge(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  }
} catch(err) {}

export function getApexSetting(key: ApexSettingKey) {
  return settings[key];
}

export function getApexSettings(): ApexSettings {
  return {...settings};
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeToDatabase() {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put({...settings}, RECORD_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

/**
 * The worker calls it when it starts, to get the saved values.
 */
export async function loadApexSettingsFromDatabase() {
  try {
    const db = await openDatabase();
    try {
      const saved = await new Promise<any>((resolve, reject) => {
        const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(RECORD_KEY);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      merge(saved);
    } finally {
      db.close();
    }
  } catch(err) {
    console.warn('[apexgram] can not load the settings', err);
  }
}

/**
 * The worker calls it, when the page says that the values were changed.
 */
export function setApexSettingsFromPage(values: Partial<ApexSettings>) {
  merge(values);
}

/**
 * Switches the classes of the page, which show or hide the parts of the interface.
 */
export function applyApexSettingsToPage() {
  if(typeof(document) === 'undefined') {
    return;
  }

  const classList = document.documentElement.classList;
  classList.toggle('apex-no-read-buttons', !settings.readButtons);
  classList.toggle('apex-no-wallpaper', !settings.wallpaper);
  classList.toggle('apex-no-star', !settings.star);
  classList.toggle('apex-no-empty-logo', !settings.emptyLogo);
}

/**
 * The page calls it from the settings tab.
 */
export function setApexSetting(key: ApexSettingKey, value: boolean, notifyWorker?: (values: ApexSettings) => any) {
  settings[key] = value;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch(err) {}

  applyApexSettingsToPage();
  writeToDatabase().catch((err) => console.warn('[apexgram] can not save the settings', err));

  try {
    const result = notifyWorker?.({...settings});
    if(result && typeof(result.catch) === 'function') {
      result.catch((err: any) => console.warn('[apexgram] the worker was not told', err));
    }
  } catch(err) {}

  window.dispatchEvent(new CustomEvent('apexgram-settings', {detail: {key, value}}));
}

applyApexSettingsToPage();
