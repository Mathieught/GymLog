import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as mutations from "@/lib/session-mutations";
import { InvalidMutationError } from "@/lib/session-mutations";
import { syncRequestSchema } from "@/lib/validations/sync";
import type { OutboxOp } from "@/lib/offline/types";

async function applyOp(userId: string, op: OutboxOp) {
  switch (op.type) {
    case "ensureSession":
      return mutations.ensureSession(userId, op);
    case "addSet":
      return mutations.addSet(userId, op);
    case "logSet":
      return mutations.logSet(userId, op);
    case "updateSet":
      return mutations.updateSet(userId, op);
    case "removeSet":
      return mutations.removeSet(userId, op);
    case "updateSetNote":
      return mutations.updateSetNote(userId, op);
    case "completeSession":
      return mutations.completeSession(userId, op.sessionId);
    case "discardSession":
      return mutations.discardSession(userId, op.sessionId);
  }
}

// Reçoit un lot d'opérations mises en attente hors ligne (voir src/lib/offline/sync.ts) et les
// rejoue dans l'ordre. S'arrête à la première erreur transitoire (réseau, base) : les opérations
// suivantes dépendent potentiellement de celle-ci (ex. une série sur une séance pas encore créée
// côté serveur). Une erreur définitive (InvalidMutationError — ex. séance déjà terminée) est en
// revanche abandonnée sans bloquer la suite : elle ne deviendra jamais valide, la retenter à
// l'infini figerait toute la file derrière elle.
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = syncRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const appliedSeqs: number[] = [];

  for (const { seq, op } of parsed.data.ops) {
    try {
      await applyOp(userId, op);
      appliedSeqs.push(seq);
    } catch (error) {
      if (error instanceof InvalidMutationError) {
        console.warn("[sync] opération abandonnée (définitivement invalide)", op.type, error.message);
        appliedSeqs.push(seq);
        continue;
      }
      console.error("[sync] échec de l'opération", op.type, error);
      break;
    }
  }

  return NextResponse.json({ appliedSeqs });
}
