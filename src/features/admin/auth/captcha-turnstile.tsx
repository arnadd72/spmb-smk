"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

// Widget Cloudflare Turnstile (PRD 1.3 butir 86). Skrip resmi dimuat langsung, tanpa paket npm.
type OpsiRender = {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
  language?: string;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "flexible" | "compact";
};
type ApiTurnstile = {
  render: (el: HTMLElement, opsi: OpsiRender) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: ApiTurnstile;
  }
}

type Props = {
  siteKey: string;
  /** Token baru setiap captcha lolos; undefined saat kedaluwarsa atau galat. */
  onToken: (token: string | undefined) => void;
  /** Naikkan angka ini untuk mengulang captcha (mis. setelah login gagal, karena token hanya sekali pakai). */
  ulang: number;
};

export function CaptchaTurnstile({ siteKey, onToken, ulang }: Props) {
  const wadah = useRef<HTMLDivElement>(null);
  const idWidget = useRef<string | undefined>(undefined);
  const panggil = useRef(onToken);
  useEffect(() => {
    panggil.current = onToken;
  }, [onToken]);

  function pasang() {
    if (!window.turnstile || !wadah.current || idWidget.current) return;
    idWidget.current = window.turnstile.render(wadah.current, {
      sitekey: siteKey,
      callback: (t) => panggil.current(t),
      "expired-callback": () => panggil.current(undefined),
      "error-callback": () => panggil.current(undefined),
      language: "id",
      theme: "light",
      size: "flexible",
    });
  }

  useEffect(() => {
    if (ulang > 0 && idWidget.current && window.turnstile) {
      panggil.current(undefined);
      window.turnstile.reset(idWidget.current);
    }
  }, [ulang]);

  useEffect(
    () => () => {
      if (idWidget.current && window.turnstile) window.turnstile.remove(idWidget.current);
      idWidget.current = undefined;
    },
    [],
  );

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={pasang} />
      <div ref={wadah} className="min-h-[65px]" aria-label="Verifikasi captcha" />
    </>
  );
}
