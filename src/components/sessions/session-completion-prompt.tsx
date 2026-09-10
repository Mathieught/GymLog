"use client";

import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { completeSession } from "@/lib/actions/sessions";

// Proposée automatiquement dès que toutes les séries de tous les exercices sont validées, au lieu
// de clôturer la séance en silence : "Continuer" laisse la séance ouverte (pour retoucher une
// série), "Terminer" la clôture et bascule sur l'historique en consultation.
export function SessionCompletionPrompt({
  sessionId,
  onContinue,
}: {
  sessionId: string;
  onContinue: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Continuer la séance"
        onClick={onContinue}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <p className="text-lg font-semibold">Séance terminée ?</p>
        <p className="mt-1 text-sm text-neutral-500">
          Toutes les séries sont validées. Tu peux encore modifier une série avant de clôturer la
          séance.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <form action={completeSession.bind(null, sessionId)}>
            <Button type="submit" className="w-full">
              Terminer la séance
            </Button>
          </form>
          <Button type="button" variant="secondary" className="w-full" onClick={onContinue}>
            Continuer
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
