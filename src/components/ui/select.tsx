"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { kontrolDasar } from "./input";
import { useFieldProps } from "./field";

/** `nonaktif`: tampil di daftar tetapi tidak bisa dipilih (mis. jurusan yang kuotanya penuh). */
export type OpsiSelect = { nilai: string; label: string; nonaktif?: boolean };

type SelectProps = {
  opsi: OpsiSelect[];
  nilai?: string;
  onChange?: (nilai: string) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
};

export function Select({
  opsi,
  nilai,
  onChange,
  placeholder = "Pilih salah satu",
  disabled,
  name,
}: SelectProps) {
  const a11y = useFieldProps();

  return (
    <RadixSelect.Root value={nilai} onValueChange={onChange} disabled={disabled} name={name}>
      <RadixSelect.Trigger
        {...a11y}
        className={cn(kontrolDasar, "flex items-center justify-between gap-2 text-left data-[placeholder]:text-tinta-redup")}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <CaretDownIcon aria-hidden className="size-4" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className="z-50 w-(--radix-select-trigger-width) overflow-hidden rounded-kontrol border border-garis bg-permukaan shadow-kartu"
        >
          <RadixSelect.Viewport className="max-h-72 p-1">
            {opsi.map((o) => (
              <RadixSelect.Item
                key={o.nilai}
                value={o.nilai}
                disabled={o.nonaktif}
                className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-kontrol px-3 text-base text-tinta outline-none data-[disabled]:cursor-not-allowed data-[disabled]:text-tinta-redup data-[highlighted]:bg-permukaan-alt data-[state=checked]:font-semibold"
              >
                <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <CheckIcon aria-hidden weight="bold" className="size-4 text-primer" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
