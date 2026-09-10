import { ListPageSkeleton } from "@/components/ui/list-page-skeleton";

export default function Loading() {
  return <ListPageSkeleton title="Exercices" withAction rows={6} />;
}
