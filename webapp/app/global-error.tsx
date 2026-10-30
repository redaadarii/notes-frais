"use client";

import "./globals.css";

/** Dernier filet : erreur dans le layout racine lui-même. Doit redéfinir <html> et <body>. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="fr">
      <body className="grid min-h-screen place-items-center p-8 text-center">
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">L&apos;application a rencontré un problème</h1>
          <button className="rounded-lg border px-4 py-2" onClick={reset}>
            Recharger
          </button>
        </div>
      </body>
    </html>
  );
}
