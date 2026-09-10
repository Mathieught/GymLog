import type { ReactNode } from "react";
import { PageHeader } from "@/components/nav/page-header";
import { Container } from "@/components/ui/container";
import { SessionCarousel } from "@/components/sessions/session-carousel";
import type { SessionRowGroup } from "@/lib/session-rows";
import type { PreviousPerformance } from "@/lib/queries/exercise-history";

export type SessionTrackerGroup = SessionRowGroup;

export function SessionTracker({
  title,
  basePath,
  backHref,
  addSetArg,
  groups,
  activeExerciseId,
  allowRemove,
  headerRight,
  history,
}: {
  title: string;
  basePath: string;
  backHref: string;
  addSetArg: string;
  groups: SessionTrackerGroup[];
  activeExerciseId: string;
  allowRemove: boolean;
  headerRight?: ReactNode;
  history: Record<string, PreviousPerformance[]>;
}) {
  return (
    <>
      <PageHeader backHref={backHref} className="max-w-2xl" />
      <Container className="max-w-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
          </div>
          {headerRight}
        </div>

        <SessionCarousel
          basePath={basePath}
          addSetArg={addSetArg}
          allowRemove={allowRemove}
          groups={groups}
          history={history}
          initialActiveExerciseId={activeExerciseId}
        />
      </Container>
    </>
  );
}
