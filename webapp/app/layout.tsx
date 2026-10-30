import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { Providers } from "@/components/providers";
import "./globals.css";

// next/font télécharge la police AU BUILD et l'héberge avec l'app :
// aucun appel à Google depuis le navigateur de l'utilisateur.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Notes de frais", template: "%s · Notes de frais" },
  description: "Saisie, validation à deux niveaux et suivi des notes de frais.",
};

/**
 * Layout RACINE : il enveloppe TOUTES les pages. Il reste affiché quand on navigue :
 * seul {children}, c'est-à-dire la page courante, est remplacé.
 * Les données sont chargées dans le navigateur par React Query, via l'API REST /api/v1.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-muted/40 min-h-screen antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
