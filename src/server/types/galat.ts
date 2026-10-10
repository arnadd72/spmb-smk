/**
 * Galat domain yang dilempar dari src/server. Route handler menerjemahkannya ke respons JSON
 * seragam (PRD v3.1 Bagian 9): { message, errors?, code }. Kelas ini tidak tahu soal HTTP Response.
 */
export class GalatApi extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "GalatApi";
  }

  static tidakTerautentikasi(pesan = "Silakan masuk terlebih dahulu.") {
    return new GalatApi(401, "UNAUTHENTICATED", pesan);
  }

  static dilarang(pesan = "Anda tidak memiliki akses ke sumber ini.") {
    return new GalatApi(403, "FORBIDDEN", pesan);
  }

  static tidakDitemukan(pesan = "Data tidak ditemukan.") {
    return new GalatApi(404, "NOT_FOUND", pesan);
  }

  static terlaluBanyak(pesan = "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.") {
    return new GalatApi(429, "TOO_MANY_REQUESTS", pesan);
  }

  static validasi(errors: Record<string, string[]>, pesan = "Data tidak valid.") {
    return new GalatApi(422, "VALIDATION_ERROR", pesan, errors);
  }
}
