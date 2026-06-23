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
          ? "rounded-lg border border-amber-500/40 bg-amber-950/40 px-4 py-4 text-sm text-amber-100"
          : "rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950"
      }
    >
      <p className="font-medium">{t("dpeAlert.title")}</p>
      <p className={`mt-2 ${isDark ? "text-amber-100/90" : "text-amber-900/90"}`}>
        {t("dpeAlert.rentalWarning")}
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[18rem] text-left text-xs">
          <thead>
            <tr className={isDark ? "text-amber-200/80" : "text-amber-800/80"}>
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
                      ? isDark
                        ? "bg-amber-500/20 font-medium text-white"
                        : "bg-amber-100 font-medium text-amber-950"
                      : isDark
                        ? "text-amber-100/85"
                        : "text-amber-900/85"
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
