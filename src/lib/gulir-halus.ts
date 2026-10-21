// Animasi gulir horizontal berkurva ease untuk carousel landing (galeri foto dan testimoni).
export const DURASI_GESER_MS = 700;

const animasiAktif = new WeakMap<HTMLElement, number>();

/** Menggulir halus ke `tujuan` dengan kurva ease-in-out. Scroll-snap dimatikan selama animasi agar tidak tersendat. */
export function gulirHalus(el: HTMLElement, tujuan: number, tanpaAnimasi: boolean) {
  batalkanGulir(el);
  if (tanpaAnimasi) {
    el.scrollLeft = tujuan;
    return;
  }
  const dari = el.scrollLeft;
  const mulai = performance.now();
  el.style.scrollSnapType = "none";
  const langkah = (sekarang: number) => {
    const t = Math.min(1, (sekarang - mulai) / DURASI_GESER_MS);
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    el.scrollLeft = dari + (tujuan - dari) * ease;
    if (t < 1) animasiAktif.set(el, requestAnimationFrame(langkah));
    else batalkanGulir(el);
  };
  animasiAktif.set(el, requestAnimationFrame(langkah));
}

export function batalkanGulir(el: HTMLElement) {
  const id = animasiAktif.get(el);
  if (id !== undefined) cancelAnimationFrame(id);
  animasiAktif.delete(el);
  el.style.scrollSnapType = "";
}
