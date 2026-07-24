"use client";

import { LOCALES } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/context";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <span className="sr-only">{t("lang.label")}</span>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          className={`rounded-md px-2.5 py-1 text-xs font-medium uppercase tracking-wide transition ${
            locale === code
              ? "bg-primary text-primary-foreground"
              : "text-muted hover:bg-surface-muted hover:text-foreground"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
