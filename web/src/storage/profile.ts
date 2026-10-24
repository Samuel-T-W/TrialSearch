import type { Profile } from "@shared/schema";

// On-device encrypted storage (plan section 10).
// The saved profile lives only in this browser's IndexedDB, encrypted with
// AES-GCM. The key is a NON-EXTRACTABLE WebCrypto key, also stored in IndexedDB
// as a CryptoKey object (IndexedDB can persist CryptoKeys without exposing the
// raw bytes). We NEVER log or transmit the Profile.

const DB_NAME = "trialsearch";
const DB_VERSION = 1;
const STORE = "kv";
const KEY_ID = "aes-key";
const PROFILE_ID = "profile";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(db: IDBDatabase, id: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbSet(db: IDBDatabase, id: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbDel(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getOrCreateKey(db: IDBDatabase): Promise<CryptoKey> {
  const existing = await idbGet<CryptoKey>(db, KEY_ID);
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
  await idbSet(db, KEY_ID, key); // CryptoKey stored; raw bytes never exposed.
  return key;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

/** Copy a view into a fresh ArrayBuffer so the type is BufferSource-compatible. */
function toBuf(view: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(view.byteLength);
  new Uint8Array(out).set(view);
  return out;
}

export async function saveProfile(profile: Profile): Promise<void> {
  const db = await openDb();
  const key = await getOrCreateKey(db);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = enc.encode(JSON.stringify(profile));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toBuf(iv) },
    key,
    toBuf(plaintext),
  );
  await idbSet(db, PROFILE_ID, { iv, ciphertext });
}

export async function loadProfile(): Promise<Profile | null> {
  const db = await openDb();
  const rec = await idbGet<{ iv: Uint8Array; ciphertext: ArrayBuffer }>(db, PROFILE_ID);
  if (!rec) return null;
  const key = await idbGet<CryptoKey>(db, KEY_ID);
  if (!key) return null;
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toBuf(rec.iv) },
      key,
      rec.ciphertext,
    );
    return JSON.parse(dec.decode(plaintext)) as Profile;
  } catch {
    return null;
  }
}

export async function hasSavedProfile(): Promise<boolean> {
  const db = await openDb();
  const rec = await idbGet(db, PROFILE_ID);
  return rec !== undefined;
}

export async function deleteProfile(): Promise<void> {
  const db = await openDb();
  await idbDel(db, PROFILE_ID);
  await idbDel(db, KEY_ID);
}
