"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api-client";
import { skemaLogin, type InputLogin } from "./schema-client";

export function FormLogin() {
  const router = useRouter();
  const [galatUmum, setGalatUmum] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InputLogin>({ resolver: zodResolver(skemaLogin) });

  async function kirim(data: InputLogin) {
    setGalatUmum(undefined);
    try {
      await apiFetch("/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      router.replace("/admin");
      router.refresh();
    } catch (e) {
      setGalatUmum(e instanceof ApiError ? e.message : "Tidak dapat terhubung ke server. Coba lagi.");
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
      <Button type="submit" ukuran="lg" memuat={isSubmitting} className="w-full">
        {isSubmitting ? "Memeriksa" : "Masuk"}
      </Button>
    </form>
  );
}
