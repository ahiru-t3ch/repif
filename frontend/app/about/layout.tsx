import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "À propos — PriceLens",
  description:
    "Comment PriceLens estime un prix immobilier à partir du DVF+, du DPE et des frais d'agence.",
};

export default function AboutLayout({ children }: { children: ReactNode }) {
  return children;
}
