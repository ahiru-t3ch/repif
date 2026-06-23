"use client";

import Image from "next/image";
import Link from "next/link";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n/context";

export function SiteHeader() {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-sm">
      <div className="mx-auto flex h-24 max-w-7xl items-center justify-between gap-4 px-5 sm:h-28 sm:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-4 rounded-lg outline-offset-4 transition hover:opacity-90"
        >
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full ring-1 ring-border sm:h-20 sm:w-20">
            <Image
              src="/logo.png"
              alt=""
              width={512}
              height={512}
              priority
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 leading-snug">
            <p className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {t("meta.title")}
            </p>
            <p className="truncate text-sm text-muted">{t("meta.subtitle")}</p>
          </div>
        </Link>

        <LanguageSwitcher />
      </div>
    </header>
  );
}
