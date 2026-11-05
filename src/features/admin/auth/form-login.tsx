"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api-client";
import { CaptchaTurnstile } from "./captcha-turnstile";
import { skemaLogin, type InputLogin } from "./schema-client";

type Props = {
  /** Site key Turnstile dari server; null = captcha mati (PRD 1.3 butir 86). */
  siteKey?: string | null;
};

export function FormLogin({ siteKey = null }: Props) {
  const router = useRouter();
  const [galatUmum, setGalatUmum] = useState<string>();
  const [captchaToken, setCaptchaToken] = useState<string>();
  const [ulangCaptcha, setUlangCaptcha] = useState(0);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InputLogin>({ resolver: zodResolver(skemaLogin) });

  const menungguCaptcha = Boolean(siteKey) && !captchaToken;

  async function kirim(data: InputLogin) {
    setGalatUmum(undefined);
    if (siteKey && !captchaToken) {
      setGalatUmum("Selesaikan captcha terlebih dahulu.");
      return;
    }
    try {
      await apiFetch("/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(siteKey ? { ...data, captchaToken } : data),
      });
      router.replace("/admin");
      router.refresh();
    } catch (e) {
      setGalatUmum(e instanceof ApiError ? e.message : "Tidak dapat terhubung ke server. Coba lagi.");
      // Token Turnstile hanya sekali pakai: minta captcha baru untuk percobaan berikutnya.
      if (siteKey) setUlangCaptcha((n) => n + 1);
    }
  }

  return (
    // method="post": bila JS gagal dimuat (mis. aset dev diblokir), form HTML biasa tidak menaruh username dan password di URL.
    <form method="post" onSubmit={handleSubmit(kirim)} noValidate className="flex flex-col gap-5">
      {galatUmum && (
        <p role="alert" className="rounded-kontrol bg-bahaya-latar px-3 py-2.5 text-sm font-semibold text-bahaya">
          {galatUmum}
        </p>
      )}
      <Field label="Username" wajib galat={errors.username?.message}>
        <Input autoComplete="username" autoCapitalize="none" {...register("username")} />
      </Field>
      <Field label="Password" wajib galat={errors.password?.message}>
        <Input type="password" autoComplete="current-password" {...register("password")} />
      </Field>
      {siteKey && <CaptchaTurnstile siteKey={siteKey} onToken={setCaptchaToken} ulang={ulangCaptcha} />}
      <Button type="submit" ukuran="lg" memuat={isSubmitting} disabled={menungguCaptcha} className="w-full">
        {isSubmitting ? "Memeriksa" : menungguCaptcha ? "Selesaikan captcha dulu" : "Masuk"}
      </Button>
    </form>
  );
}
