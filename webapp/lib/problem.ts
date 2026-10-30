/** Format des erreurs de l'API (RFC 9457 « Problem Details »), partagé par le serveur et l'écran. */

/** Erreur localisée dans un fichier importé (ligne Excel, en-tête = ligne 1 ; 0 = tout le fichier). */
export interface RowError {
  row: number;
  column?: string;
  message: string;
}

export interface ProblemDetails {
  type: string;
  status: number;
  title: string;
  detail: string;
  /** Erreurs par champ de formulaire : { amount: ["Le montant doit être positif"] }. */
  errors?: Record<string, string[]>;
  /** Erreurs par ligne d'un fichier importé. */
  rows?: RowError[];
}
