import { getDriveAccessToken } from './googleAuth';

// Google Drive REST calls for the single backup file in the app's hidden appDataFolder.
const FILE_NAME = 'mynotes-backup.json';
const API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

export interface RemoteBackup {
  id: string;
  modifiedTime: string;
}

/** fetch with a Drive token; retries once with a refreshed token on 401. */
async function driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
  let token = await getDriveAccessToken();
  const go = () =>
    fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` } });
  let res = await go();
  if (res.status === 401) {
    token = await getDriveAccessToken(token);
    res = await go();
  }
  if (!res.ok) throw new Error(`Google Drive error ${res.status}: ${await res.text()}`);
  return res;
}

export async function findBackup(): Promise<RemoteBackup | null> {
  const q = encodeURIComponent(`name = '${FILE_NAME}'`);
  const res = await driveFetch(
    `${API}?spaces=appDataFolder&q=${q}&orderBy=modifiedTime desc&fields=files(id,modifiedTime)`,
  );
  const { files } = (await res.json()) as { files: RemoteBackup[] };
  return files[0] ?? null;
}

export async function downloadBackup(id: string): Promise<unknown> {
  const res = await driveFetch(`${API}/${id}?alt=media`);
  return res.json();
}

/** Creates the backup file, or overwrites it in place when `existingId` is given. */
export async function uploadBackup(json: string, existingId?: string): Promise<RemoteBackup> {
  if (existingId) {
    const res = await driveFetch(`${UPLOAD}/${existingId}?uploadType=media&fields=id,modifiedTime`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: json,
    });
    return res.json();
  }
  const boundary = `mynotes${Date.now()}`;
  const metadata = JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] });
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${json}\r\n--${boundary}--`;
  const res = await driveFetch(`${UPLOAD}?uploadType=multipart&fields=id,modifiedTime`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  return res.json();
}
