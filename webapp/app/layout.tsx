import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// next/font télécharge la police AU BUILD et l'héberge avec l'app :
// aucun appel à Google depuis le navigateur de l'utilisateur.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Notes de frais",
  description: "Saisie, validation à deux niveaux et suivi des notes de frais.",
};

/**
 * Layout RACINE : il enveloppe TOUTES les pages. Il reste affiché quand on navigue :
 * seul {children}, c'est-à-dire la page courante, est remplacé.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
