"use client";

import { FC, useTransition } from "react";
import { useLocale } from "next-intl";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/shared/components";
import { useRouter, usePathname } from "@/features/i18n/lib/navigation";
import { useParams } from "next/navigation";

const supportedLocales = [
  { code: "en", label: "English", emoji: "🇺🇸" },
  { code: "ua", label: "Українська", emoji: "🇺🇦" },
] as const;

export const LocaleSwitcher: FC = () => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  const handleSelect = (nextLocale: string) => {
    startTransition(() => {
      router.replace(
        // @ts-expect-error - params may vary depending on your route setup
        { pathname, params },
        { locale: nextLocale },
      );
    });
  };

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
