// Impor modular, bukan `import { google } from "googleapis"`: paket penuh memuat ratusan API (sekitar 100 MB RAM dan
// puluhan detik saat pertama dimuat), yang membuat Passenger di hosting cPanel 1 GB menyerah (502). Yang dipakai cuma Drive v3.
import { drive_v3 } from "googleapis/build/src/apis/drive/v3";
import { OAuth2Client } from "google-auth-library";
import {
  ambilPengaturan,
  ambilPengaturanTerenkripsi,
  hapusPengaturan,
  simpanPengaturan,
  simpanPengaturanTerenkripsi,
} from "@/server/services/pengaturan";

// OAuth akun Google (scope drive.file: aplikasi hanya melihat file yang ia buat sendiri).
// Refresh token disimpan terenkripsi di tabel Pengaturan, tidak pernah di .env (PRD v4 7.3).
// Port TypeScript dari GoogleDriveOAuth.php (arsip).

export const KEY_REFRESH_TOKEN = "google_drive_refresh_token";
export const KEY_EMAIL = "google_drive_email";
export const KEY_ROOT_FOLDER = "google_drive_root_folder_id";
const SCOPE_DRIVE = "https://www.googleapis.com/auth/drive.file";
const MIME_FOLDER = "application/vnd.google-apps.folder";

export function klienOAuth(): OAuth2Client {
  const id = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const rahasia = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const redirect = process.env.GOOGLE_DRIVE_REDIRECT_URI;
  if (!id || !rahasia || !redirect) {
    throw new Error("GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, dan GOOGLE_DRIVE_REDIRECT_URI belum diisi.");
  }
  return new OAuth2Client(id, rahasia, redirect);
}

export function urlOtorisasi(state: string): string {
  return klienOAuth().generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // wajib agar Google selalu memberi refresh token
    scope: [SCOPE_DRIVE],
    state,
  });
}

/** Tukar kode otorisasi dengan token lalu simpan refresh token terenkripsi. */
export async function hubungkanDrive(kode: string): Promise<{ email: string | null }> {
  const klien = klienOAuth();
  const { tokens } = await klien.getToken(kode);

  if (!tokens.refresh_token) {
    throw new Error("Google tidak mengembalikan refresh token. Cabut akses aplikasi di akun Google lalu ulangi.");
  }
  await simpanPengaturanTerenkripsi(KEY_REFRESH_TOKEN, tokens.refresh_token);

  klien.setCredentials(tokens);
  let email: string | null = null;
  try {
    const about = await new drive_v3.Drive({ auth: klien }).about.get({ fields: "user(emailAddress)" });
    email = about.data.user?.emailAddress ?? null;
  } catch {
    // Email hanya informasi tampilan.
  }
  if (email) await simpanPengaturan(KEY_EMAIL, email);
  return { email };
}

export async function putuskanDrive(): Promise<void> {
  await hapusPengaturan(KEY_REFRESH_TOKEN);
  await hapusPengaturan(KEY_EMAIL);
}

export type StatusDrive = { terhubung: boolean; email: string | null; adaKredensial: boolean };

export async function statusDrive(): Promise<StatusDrive> {
  return {
    terhubung: (await ambilPengaturan(KEY_REFRESH_TOKEN)) !== null,
    email: await ambilPengaturan(KEY_EMAIL),
    adaKredensial: Boolean(process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET),
  };
}

/** Klien Drive terotorisasi; access token diperbarui otomatis oleh google-auth-library. */
export async function klienDrive(): Promise<drive_v3.Drive> {
  const refresh = await ambilPengaturanTerenkripsi(KEY_REFRESH_TOKEN);
  if (!refresh) throw new Error("Google Drive belum dihubungkan.");

  const klien = klienOAuth();
  klien.setCredentials({ refresh_token: refresh });
  return new drive_v3.Drive({ auth: klien });
}

/** ID folder root (mis. "SPMB"); dibuat otomatis bila belum ada. */
export async function idFolderRoot(drive: drive_v3.Drive): Promise<string> {
  const tersimpan = await ambilPengaturan(KEY_ROOT_FOLDER);
  if (tersimpan) return tersimpan;

  const nama = process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME ?? "SPMB";
  const buat = await drive.files.create({ requestBody: { name: nama, mimeType: MIME_FOLDER }, fields: "id" });
  const id = buat.data.id;
  if (!id) throw new Error("Gagal membuat folder root di Google Drive.");

  await simpanPengaturan(KEY_ROOT_FOLDER, id);
  return id;
}
