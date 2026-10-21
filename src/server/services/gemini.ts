// Klien Gemini (Google AI) untuk cadangan jawaban Tanya Panitia. Permintaan manual lewat fetch, tanpa SDK, agar mudah diuji dan
// tidak menambah ketergantungan. Hanya teks pertanyaan dan konteks sekolah yang dikirim; tidak pernah data pendaftar.

export type OpsiGemini = { instruksi: string; pesan: string; batasWaktuMs?: number };

const MODEL_BAWAAN = "gemini-3.5-flash-lite";

export const adaGemini = () => Boolean(process.env.GEMINI_API_KEY);

/** Hapus format markdown ringan supaya tampil rapi sebagai teks biasa di jendela obrolan. */
export function bersihkanTeksAi(teks: string): string {
  return teks
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`+/g, "")
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "")
    .replace(/^[ \t]*[*-][ \t]+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 1200);
}

/** Satu pertanyaan, satu jawaban. Mengembalikan null bila tidak ada kunci, gagal, kena batas waktu, diblokir, atau kosong. */
export async function tanyaGemini({ instruksi, pesan, batasWaktuMs = 9000 }: OpsiGemini): Promise<string | null> {
  const kunci = process.env.GEMINI_API_KEY;
  if (!kunci) return null;
  const model = (process.env.GEMINI_MODEL || MODEL_BAWAAN).replace(/[^\w.\-]/g, "");

  const pengendali = new AbortController();
  const timer = setTimeout(() => pengendali.abort(), batasWaktuMs);
  try {
    const kirim = () =>
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": kunci },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instruksi }] },
          contents: [{ role: "user", parts: [{ text: pesan }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
        }),
        signal: pengendali.signal,
      });
    let res = await kirim();
    // 503 (permintaan sedang tinggi) dan 429 (kena batas laju) biasanya sementara: ulangi sekali di dalam batas waktu yang sama.
    if (res.status === 503 || res.status === 429) {
      await new Promise((selesai) => setTimeout(selesai, 600));
      res = await kirim();
    }
    if (!res.ok) {
      console.error("[gemini] status", res.status);
      return null;
    }
    const data = (await res.json()) as {
      promptFeedback?: { blockReason?: string };
      candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[];
    };
    if (data.promptFeedback?.blockReason) return null;
    const kandidat = data.candidates?.[0];
    if (!kandidat || kandidat.finishReason === "SAFETY" || kandidat.finishReason === "RECITATION") return null;
    const teks = (kandidat.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    return teks ? bersihkanTeksAi(teks) : null;
  } catch (e) {
    console.error("[gemini] gagal:", e instanceof Error ? e.name : "tidak diketahui");
    return null;
  } finally {
    clearTimeout(timer);
  }
}
