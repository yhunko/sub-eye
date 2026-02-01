"use client";

import { FC, startTransition } from "react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/shared/components";
import { useUser } from "@clerk/clerk-react";
import { useUpdateUserMetadata } from "../../../entities/user";
import { setLocale } from "@/i18n/runtime";

const supportedLocales = [
  { code: "en", label: "English", emoji: "🇺🇸" },
  { code: "uk", label: "Українська", emoji: "🇺🇦" },
] as const;

export const LocaleSwitcher: FC = () => {
  const { user } = useUser();
  const { mutate, isPending } = useUpdateUserMetadata();

  const handleSelect = (nextLocale: "en" | "uk") => {
    mutate(
      {
        locale: nextLocale,
      },
      {
        onSuccess() {
          startTransition(async () => {
            await user?.reload();
            setLocale(nextLocale);
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
