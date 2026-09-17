// Offline write-queue untuk mobile tagging.
// Menyimpan pembaruan (PUT /records/{id}) di IndexedDB ketika offline,
// lalu mengirim ulang otomatis saat koneksi kembali.
import api from "@/lib/api";

const DB_NAME = "eqms-mobile";
const DB_VERSION = 1;
const STORE = "pending";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "localId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function enqueueUpdate(rid, payload, meta = {}) {
  const db = await openDb();
  const item = {
    localId: `${rid}-${Date.now()}`,
    rid,
    payload,
    meta, // label untuk ditampilkan (mis. id_actual)
    createdAt: new Date().toISOString(),
  };
  return new Promise((resolve, reject) => {
    const store = tx(db, "readwrite");
    // hanya simpan satu pending terbaru per rid (timpa yang lama)
    const idx = store.getAll();
    idx.onsuccess = () => {
      const olds = (idx.result || []).filter((x) => x.rid === rid);
      olds.forEach((o) => store.delete(o.localId));
      store.add(item);
    };
    const t = store.transaction;
    t.oncomplete = () => resolve(item);
    t.onerror = () => reject(t.error);
  });
}

export async function getPending() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = tx(db, "readonly");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function pendingCount() {
  const items = await getPending();
  return items.length;
}

async function removeItem(localId) {
  const db = await openDb();
  return new Promise((resolve) => {
    const store = tx(db, "readwrite");
    store.delete(localId);
    store.transaction.oncomplete = () => resolve();
  });
}

// Kirim ulang semua pending. Mengembalikan {synced, failed}.
export async function syncPending() {
  if (!navigator.onLine) return { synced: 0, failed: 0, skipped: true };
  const items = await getPending();
  let synced = 0;
  let failed = 0;
  for (const it of items) {
    try {
      await api.put(`/records/${it.rid}`, it.payload);
      await removeItem(it.localId);
      synced += 1;
    } catch (e) {
      // 4xx (validasi/izin) -> buang agar tidak menyumbat antrian; 5xx/jaringan -> tahan
      const status = e?.response?.status;
      if (status && status >= 400 && status < 500) {
        await removeItem(it.localId);
      }
      failed += 1;
    }
  }
  return { synced, failed };
}
