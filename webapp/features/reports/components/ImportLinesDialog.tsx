"use client";

import { DownloadIcon, FileSpreadsheetIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import type { RowError } from "@/lib/problem";
import { useImportLines } from "../hooks/use-report-mutations";
import { spreadsheetFileSchema } from "../schemas";

/** Import de dépenses depuis le modèle Excel ; les erreurs sont listées ligne par ligne. */
export function ImportLinesDialog({ reportId }: { reportId: string }) {
  const [open, setOpen] = useState(false);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const importLines = useImportLines(reportId);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    setRowErrors([]);
    setFileError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = spreadsheetFileSchema.safeParse(new FormData(event.currentTarget).get("file"));
    if (!parsed.success) {
      setFileError(parsed.error.issues[0]!.message);
      return;
    }
    setFileError(null);
    try {
      const { imported } = await importLines.mutateAsync(parsed.data);
      toast.success(`${imported} dépense(s) importée(s)`);
      handleOpenChange(false);
    } catch (error) {
      setRowErrors(error instanceof ApiError ? error.rowErrors : []);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheetIcon /> Importer depuis Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importer des dépenses</DialogTitle>
          <DialogDescription>
            Remplissez le modèle, puis déposez-le ici. Le fichier est importé entièrement, ou pas du tout.
          </DialogDescription>
        </DialogHeader>

        <Button variant="link" className="justify-start px-0" asChild>
          <a href="/api/v1/templates/expense-lines" download>
            <DownloadIcon /> Télécharger le modèle Excel
          </a>
        </Button>

        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="import-file">Fichier .xlsx</Label>
            <Input
              id="import-file"
              name="file"
              type="file"
              accept=".xlsx"
              aria-invalid={!!fileError}
              aria-describedby={fileError ? "import-file-error" : undefined}
            />
            {fileError && (
              <p id="import-file-error" role="alert" className="text-destructive text-sm">
                {fileError}
              </p>
            )}
          </div>

          {rowErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTitle>Fichier refusé : {rowErrors.length} erreur(s)</AlertTitle>
              <AlertDescription>
                <ul className="mt-1 max-h-48 list-disc space-y-0.5 overflow-y-auto pl-4">
                  {rowErrors.map((e, i) => (
                    <li key={`${e.row}-${e.column}-${i}`}>
                      {e.row > 0 && <strong>Ligne {e.row} : </strong>}
                      {e.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={importLines.isPending}>
              {importLines.isPending ? "Import en cours…" : "Importer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
