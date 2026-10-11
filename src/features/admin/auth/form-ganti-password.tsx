"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api-client";
import { skemaGantiPassword, type InputGantiPassword } from "./schema-client";

export function FormGantiPassword() {
  const router = useRouter();
  const [galatUmum, setGalatUmum] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InputGantiPassword>({ resolver: zodResolver(skemaGantiPassword) });

  async function kirim(data: InputGantiPassword) {
    setGalatUmum(undefined);
    try {
      await apiFetch("/admin/ganti-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      router.replace("/admin");
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.errors) {
        for (const [k, v] of Object.entries(e.errors)) setError(k as keyof InputGantiPassword, { message: v[0] });
      } else {
        setGalatUmum(e instanceof ApiError ? e.message : "Tidak dapat terhubung ke server. Coba lagi.");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(kirim)} noValidate className="flex flex-col gap-5">
      {galatUmum && (
        <p role="alert" className="rounded-kontrol bg-bahaya-latar px-3 py-2.5 text-sm font-semibold text-bahaya">
          {galatUmum}
        </p>
      )}
      <Field label="Password lama" wajib galat={errors.passwordLama?.message}>
        <Input type="password" autoComplete="current-password" {...register("passwordLama")} />
      </Field>
      <Field label="Password baru" wajib bantuan="Minimal 10 karakter, memuat huruf dan angka." galat={errors.passwordBaru?.message}>
        <Input type="password" autoComplete="new-password" {...register("passwordBaru")} />
      </Field>
      <Field label="Ulangi password baru" wajib galat={errors.konfirmasi?.message}>
        <Input type="password" autoComplete="new-password" {...register("konfirmasi")} />
      </Field>
      <Button type="submit" ukuran="lg" memuat={isSubmitting} className="w-full">
        {isSubmitting ? "Menyimpan" : "Simpan password baru"}
      </Button>
    </form>
  );
}
