"use client";

import { useI18n } from "@/lib/i18n/context";
import {
  DPE_RENTAL_ROWS,
  dpeValueToLetter,
  isRestrictedDpe,
} from "@/lib/dpe-rental";

type DpeRentalAlertProps = {
  dpeValue: string;
  variant?: "light" | "dark";
};

export function DpeRentalAlert({
  dpeValue,
  variant = "light",
}: DpeRentalAlertProps) {
  const { t } = useI18n();

  if (!isRestrictedDpe(dpeValue)) {
    return null;
  }

  const selectedLetter = dpeValueToLetter(Number(dpeValue));
  const isDark = variant === "dark";

  return (
    <div
      role="alert"
      className={
        isDark
          ? "rounded-lg border border-warning/30 bg-warning-muted/80 px-4 py-4 text-sm text-warning-foreground backdrop-blur-sm"
          : "rounded-lg border border-warning/25 bg-warning-muted px-4 py-4 text-sm text-warning-foreground"
      }
    >
      <p className="font-medium">{t("dpeAlert.title")}</p>
      <p className="mt-2 text-warning-foreground/90">
        {t("dpeAlert.rentalWarning")}
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[18rem] text-left text-xs">
          <thead>
            <tr className="text-warning/80">
              <th className="pb-2 pr-3 font-medium">{t("dpeAlert.tableLetter")}</th>
              <th className="pb-2 pr-3 font-medium">{t("dpeAlert.tableStatus")}</th>
              <th className="pb-2 font-medium">{t("dpeAlert.tableDate")}</th>
            </tr>
          </thead>
          <tbody>
            {DPE_RENTAL_ROWS.map((row) => {
              const isSelected = row.letter === selectedLetter;

              return (
                <tr
                  key={row.letter}
                  className={
                    isSelected
                      ? "bg-warning-muted font-medium text-warning-foreground"
                      : "text-warning-foreground/85"
                  }
                >
                  <td className="py-1.5 pr-3">{row.letter}</td>
                  <td className="py-1.5 pr-3">{t(`dpeAlert.${row.statusKey}`)}</td>
                  <td className="py-1.5">{t(`dpeAlert.${row.dateKey}`)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
