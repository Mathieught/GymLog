"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { Input, Textarea, Label, FieldError } from "@/components/ui/field";
import { MuscleGroupPicker } from "@/components/exercises/muscle-group-picker";
import { SetCountPicker } from "@/components/exercises/set-count-picker";
import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";
import { initialActionState, type ActionState } from "@/lib/action-state";

export function ExerciseForm({
  action,
  backHref,
  title,
  defaultValues,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  backHref: string;
  title: string;
  defaultValues?: {
    name: string;
    muscle: string[];
    targetSets: number;
    description: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [muscle, setMuscle] = useState<string[]>(defaultValues?.muscle ?? []);
  const [targetSets, setTargetSets] = useState(defaultValues?.targetSets ?? 3);

  return (
    <>
      <PageHeader
        backHref={backHref}
        right={
          <button
            type="submit"
            form="exercise-form"
            disabled={pending}
            aria-label={pending ? "Enregistrement..." : "Enregistrer"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#23E16C] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Check className="h-5 w-5" strokeWidth={3} />
          </button>
        }
      />

      <Container>
        <form id="exercise-form" action={formAction} className="space-y-5">
          <h1 className="text-2xl font-bold">{title}</h1>

          <div>
            <Label htmlFor="name">Nom de l&apos;exercice</Label>
            <Input
              id="name"
              name="name"
              defaultValue={defaultValues?.name}
              placeholder="Développé couché"
              required
            />
            <FieldError messages={state.fieldErrors?.name} />
          </div>

          <div>
            <Label htmlFor="muscle">Muscles ciblés</Label>
            <MuscleGroupPicker id="muscle" name="muscle" value={muscle} onChange={setMuscle} />
            <FieldError messages={state.fieldErrors?.muscle} />
          </div>

          <div>
            <Label htmlFor="targetSets">Nombre de série</Label>
            <SetCountPicker
              id="targetSets"
              name="targetSets"
              value={targetSets}
              onChange={setTargetSets}
            />
            <FieldError messages={state.fieldErrors?.targetSets} />
          </div>

          <div>
            <Label htmlFor="description">Note / description (facultatif)</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={defaultValues?.description ?? ""}
              placeholder="Ex : buter légèrement les omoplates, prise large..."
            />
            <FieldError messages={state.fieldErrors?.description} />
          </div>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        </form>
      </Container>
    </>
  );
}
