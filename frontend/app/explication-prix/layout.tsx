import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Explication du calcul — Hawk Prix Immo",
  description:
    "Comment Hawk Prix Immo estime un prix immobilier à partir du DVF+, du DPE et des frais d'agence.",
};

export default function ExplicationPrixLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
