"use client";

import { useState, type FormEvent } from "react";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { transitionInputSchema } from "../schemas";

interface RejectDialogProps {
  pending: boolean;
  onReject: (comment: string) => Promise<unknown>;
}

export function RejectDialog({ pending, onReject }: RejectDialogProps) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string[]>();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = transitionInputSchema.safeParse({ action: "REJECT", comment });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message));
      return;
    }
    await onReject(parsed.data.comment!);
    setOpen(false);
    setComment("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Rejeter</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeter la note</DialogTitle>
          <DialogDescription>
            Le collaborateur verra ce motif et pourra corriger sa note avant de la soumettre à nouveau.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <FormField id="reject-comment" label="Motif du rejet" errors={error}>
            {(aria) => (
              <Textarea
                {...aria}
                rows={4}
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  setError(undefined);
                }}
                placeholder="Ex. Le justificatif du 12/10 est illisible"
              />
            )}
          </FormField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              Confirmer le rejet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
