/*
 * CUSTOM: who gets the ApexGram star next to the name.
 *
 * Telegram has no way for one app to tell another one "I am being used", so this client does not
 * guess and does not hide anything in the messages. The star is shown for:
 *   1. you, always (you use this client);
 *   2. the people from the public list of the client users: a small JSON file that you host
 *      yourself (for example in the repository of the client on GitHub). People are added to it
 *      by their own wish, and everybody can read it, so it is clear who is on it.
 *   3. the ids that are written in APEX_LOCAL_USER_IDS below (handy for testing).
 */
import rootScope from '@lib/rootScope';

/**
 * Link to the JSON list of the users, for example
 * 'https://raw.githubusercontent.com/YOUR_NAME/YOUR_REPO/main/users.json'.
 * The file may look like {"users": [123456789, 987654321]} or just [123456789, 987654321].
 * While it is empty, only the star of the owner and APEX_LOCAL_USER_IDS are shown.
 */
export const APEX_USERS_URL = '';

/** Telegram ids of the users that get the star without any list (numbers, not quotes). */
export const APEX_LOCAL_USER_IDS: number[] = [];

const CACHE_KEY = 'apexgram-users';
const FETCH_TIMEOUT = 3000;

const userIds = new Set<number>(APEX_LOCAL_USER_IDS);
let loadPromise: Promise<void>;

function parseIds(data: any): number[] {
  const list = Array.isArray(data) ? data : data?.users;
  if(!Array.isArray(list)) {
    return [];
  }

  return list.map(Number).filter((id) => Number.isInteger(id) && id > 0);
}

function replaceIds(ids: number[]) {
  userIds.clear();
  APEX_LOCAL_USER_IDS.forEach((id) => userIds.add(id));
  ids.forEach((id) => userIds.add(id));
}

async function load() {
  // * the last known list, so the stars are there even before the answer of the network
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if(cached) {
      replaceIds(parseIds(JSON.parse(cached)));
    }
  } catch(err) {
    // * the cache is optional
  }

  if(!APEX_USERS_URL) {
    return;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    const response = await fetch(APEX_USERS_URL, {cache: 'no-cache', signal: controller.signal});
    clearTimeout(timer);
    if(!response.ok) {
      return;
    }

    const ids = parseIds(await response.json());
    replaceIds(ids);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(ids));
    } catch(err) {
      // * the cache is optional
    }
  } catch(err) {
    console.warn('[apexgram] can not load the list of the users', err);
  }
}

/** Loads the list of the users once; it never fails and never waits for longer than a few seconds. */
export function loadApexUsers() {
  return loadPromise ??= load();
}

export function isApexUser(peerId: PeerId) {
  return peerId === rootScope.myId || userIds.has(peerId);
}
