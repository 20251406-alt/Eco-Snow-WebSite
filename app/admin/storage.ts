import { emptyStore, type Store, type Photo } from "./domain";
export const STORAGE_KEY = "ecosnow-admin-v1";
export function decodeStore(raw: string | null): Store {
  if (!raw) return emptyStore();
  const data = JSON.parse(raw);
  if (
    !data ||
    data.version !== 1 ||
    ![
      "organizations",
      "zones",
      "products",
      "criteria",
      "works",
      "prior",
      "reports",
      "evaluations",
      "audit",
    ].every((key) => Array.isArray(data[key])) ||
    !data.settings ||
    typeof data.settings !== "object"
  )
    throw new Error(
      "저장 데이터 형식을 읽을 수 없습니다. 원본은 덮어쓰지 않았습니다.",
    );
  return data as Store;
}
export function saveStore(storage: Pick<Storage, "setItem">, data: Store) {
  storage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function openPhotos(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("ecosnow-photos-v1", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("photos");
    r.onerror = () =>
      reject(
        new Error("사진 저장소를 열 수 없습니다. 수동 기록을 이용하세요."),
      );
    r.onsuccess = () => resolve(r.result);
  });
}
export async function putPhoto(orgId: string, photo: Photo, file: File) {
  if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024)
    throw new Error("8MB 이하 이미지 파일을 선택하세요.");
  const db = await openPhotos();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("photos", "readwrite");
      tx.objectStore("photos").put(file, `${orgId}:${photo.id}`);
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () =>
        reject(
          new Error(
            "사진 저장 실패: 용량을 확인하거나 수동 기록을 이용하세요.",
          ),
        );
    });
  } finally {
    db.close();
  }
}
export async function getPhoto(
  orgId: string,
  photoId: string,
): Promise<Blob | undefined> {
  const db = await openPhotos();
  try {
    return await new Promise<Blob | undefined>((resolve, reject) => {
      const r = db
        .transaction("photos")
        .objectStore("photos")
        .get(`${orgId}:${photoId}`);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(new Error("사진 읽기 실패"));
    });
  } finally {
    db.close();
  }
}
