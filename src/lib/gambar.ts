"use client";

/**
 * Perkecil dan kompres foto di browser sebelum diunggah (PRD v3.1 10.4: sisi panjang maksimal 2000 px untuk rapor,
 * 1600 px untuk lainnya, JPEG kualitas 0,85). Foto kamera HP sering lebih dari 5 MB; hasilnya jauh lebih kecil
 * tapi angka pada KK dan rapor tetap terbaca. Berkas bukan gambar, sudah kecil, atau tidak bisa didekode dikembalikan apa adanya.
 */
export async function kompresGambar(berkas: File, sisiMaks: number): Promise<File> {
  if (!berkas.type.startsWith("image/") || typeof createImageBitmap === "undefined" || typeof OffscreenCanvas === "undefined") return berkas;
  try {
    const bmp = await createImageBitmap(berkas, { imageOrientation: "from-image" });
    const skala = Math.min(1, sisiMaks / Math.max(bmp.width, bmp.height));
    if (skala === 1 && berkas.size <= 1.5 * 1024 * 1024) {
      bmp.close();
      return berkas;
    }
    const lebar = Math.max(1, Math.round(bmp.width * skala));
    const tinggi = Math.max(1, Math.round(bmp.height * skala));
    const kanvas = new OffscreenCanvas(lebar, tinggi);
    const ctx = kanvas.getContext("2d");
    if (!ctx) {
      bmp.close();
      return berkas;
    }
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, lebar, tinggi);
    ctx.drawImage(bmp, 0, 0, lebar, tinggi);
    bmp.close();
    const blob = await kanvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
    if (blob.size >= berkas.size && skala === 1) return berkas;
    return new File([blob], berkas.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return berkas;
  }
}
