/*
 * CUSTOM: keeps the messages that were deleted by other people, so they survive a page reload.
 *
 * It uses its own tiny IndexedDB database, independent from the other storages of the app,
 * so it can not break anything else. Every function is best-effort: on any error it just does nothing.
 */

const DB_NAME = 'tweb-kept-deleted-messages';
const STORE_NAME = 'messages';
const PEER_INDEX = 'peerKey';

type KeptRecord = {
  peerKey: string,
  mid: number,
  message: any
};

let dbPromise: Promise<IDBDatabase>;

function openDatabase() {
  if(dbPromise) {
    return dbPromise;
  }

  return dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE_NAME);
      store.createIndex(PEER_INDEX, PEER_INDEX, {unique: false});
    };

    request.onsuccess = () => {
      const db = request.result;
      // * if the browser closes the connection, open a new one next time
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

function makePeerKey(accountNumber: number, peerId: PeerId) {
  return `${accountNumber}_${peerId}`;
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionToPromise(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

 export async function keepDeletedMessage(accountNumber: number, peerId: PeerId, message: {mid?: number}) {
  try {
    const db = await openDatabase();
    const peerKey = makePeerKey(accountNumber, peerId);

    const put = (value: any) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const record: KeptRecord = {peerKey, mid: message.mid, message: value};
      transaction.objectStore(STORE_NAME).put(record, `${peerKey}_${message.mid}`);
      return transactionToPromise(transaction);
    };

    try {
      await put(message);
    } catch(err) {
      // * something inside the message can not be stored (for example a media object): keep at least the text
      await put({...message, media: undefined});
    }
  } catch(err) {
    console.warn('[kept-deleted] can not save a message', err);
  }
}

export async function getKeptDeletedMessages(accountNumber: number, peerId: PeerId): Promise<any[]> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const index = transaction.objectStore(STORE_NAME).index(PEER_INDEX);
    const records = await requestToPromise<KeptRecord[]>(index.getAll(makePeerKey(accountNumber, peerId)));
    return records.map((record) => record.message).filter(Boolean);
  } catch(err) {
    console.warn('[kept-deleted] can not read messages', err);
    return [];
  }
}

export async function forgetKeptDeletedMessages(accountNumber: number, peerId: PeerId, mids: number[]) {
  if(!mids.length) {
    return;
  }

  try {
    const db = await openDatabase();
    const peerKey = makePeerKey(accountNumber, peerId);
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    mids.forEach((mid) => store.delete(`${peerKey}_${mid}`));
    await transactionToPromise(transaction);
  } catch(err) {
    console.warn('[kept-deleted] can not forget messages', err);
  }
}
