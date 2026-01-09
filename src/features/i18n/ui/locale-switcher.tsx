"use client";

import { FC, startTransition } from "react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/shared/components";
import { useUpdateUserPublicMetadata } from "@/entities/user";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

const supportedLocales = [
  { code: "en", label: "English", emoji: "🇺🇸" },
  { code: "ua", label: "Українська", emoji: "🇺🇦" },
] as const;

export const LocaleSwitcher: FC = () => {
  const router = useRouter();
  const { user } = useUser();
  const { mutate, isPending } = useUpdateUserPublicMetadata();

  const handleSelect = (nextLocale: string) => {
    mutate(
      {
        locale: nextLocale,
      },
      {
        onSuccess() {
          startTransition(() => {
            router.refresh();
          });
        },
      },
    );
  };

  const locale = user?.publicMetadata?.locale ?? "en";
  const selected =
    supportedLocales.find((l) => l.code === locale) || supportedLocales[0];

  return (
    <div className="flex items-center gap-2">
      <Select value={locale} onValueChange={handleSelect} disabled={isPending}>
        <SelectTrigger className="w-fit">
          <SelectValue>
            <span className="flex items-center gap-2">
              <span className="text-lg">{selected.emoji}</span>
              <span>{selected.label}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {supportedLocales.map((l) => (
            <SelectItem key={l.code} value={l.code}>
              <span className="flex items-center gap-2">
                <span className="text-lg">{l.emoji}</span>
                <span>{l.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
