"use client";

import { useState } from "react";

import { useEstimateSession } from "@/lib/estimate-session/context";
import { useI18n } from "@/lib/i18n/context";
import {
  createShareScenario,
  SHARE_PAYLOAD_VERSION,
} from "@/lib/share-scenario";

export function useShareScenario() {
  const { t } = useI18n();
  const { getShareSnapshot } = useEstimateSession();
  const [shareStatus, setShareStatus] = useState<
    "idle" | "loading" | "copied" | "error"
  >("idle");
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  async function handleShareScenario() {
    const snapshot = getShareSnapshot();
    if (!snapshot?.result) {
      return;
    }

    setShareStatus("loading");
    setShareMessage(null);
    try {
      const created = await createShareScenario({
        v: SHARE_PAYLOAD_VERSION,
        ...snapshot,
        result: snapshot.result,
      });
      const url = `${window.location.origin}${created.url_path}`;
      try {
        await navigator.clipboard.writeText(url);
        setShareStatus("copied");
        setShareMessage(t("share.copied"));
      } catch {
        setShareStatus("copied");
        setShareMessage(url);
      }
      window.setTimeout(() => {
        setShareStatus("idle");
        setShareMessage(null);
      }, 4000);
    } catch (err) {
      setShareStatus("error");
      setShareMessage(err instanceof Error ? err.message : t("share.error"));
    }
  }

  return {
    shareStatus,
    shareMessage,
    handleShareScenario,
  };
}
