const SATUAN = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"];

function bilangBulat(n: number): string {
  if (n < 10) return SATUAN[n];
  if (n === 10) return "sepuluh";
  if (n === 11) return "sebelas";
  if (n < 20) return `${SATUAN[n - 10]} belas`;
  if (n < 100) return `${SATUAN[Math.floor(n / 10)]} puluh${n % 10 ? ` ${SATUAN[n % 10]}` : ""}`;
  if (n < 200) return `seratus${n - 100 ? ` ${bilangBulat(n - 100)}` : ""}`;
  if (n < 1000) return `${SATUAN[Math.floor(n / 100)]} ratus${n % 100 ? ` ${bilangBulat(n % 100)}` : ""}`;
  return String(n);
}

/** Nilai ke kata Indonesia: 85 -> "delapan puluh lima", 87.5 -> "delapan puluh tujuh koma lima". */
export function terbilang(nilai: number): string {
  if (!Number.isFinite(nilai) || nilai < 0) return "";
  const [bulat, desimal] = String(Math.round(nilai * 100) / 100).split(".");
  const depan = bilangBulat(Number(bulat));
  return desimal ? `${depan} koma ${[...desimal].map((d) => SATUAN[Number(d)]).join(" ")}` : depan;
}
