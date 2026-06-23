import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_STORAGE_KEY = "repif-locale";

export const messages = { fr, en } as const;

export type Messages = (typeof messages)[Locale];

function getByPath(obj: Record<string, unknown>, path: string): string | undefined {
  const value = path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);

  return typeof value === "string" ? value : undefined;
}

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const template = getByPath(messages[locale] as unknown as Record<string, unknown>, key) ?? key;

  if (!vars) {
    return template;
  }

  return Object.entries(vars).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    template,
  );
}

export function isLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function localeToIntl(locale: Locale): string {
  return locale === "fr" ? "fr-FR" : "en-US";
}
