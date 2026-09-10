import { FormPageSkeleton } from "@/components/ui/form-page-skeleton";

export default function Loading() {
  return <FormPageSkeleton backHref="/workouts" fields={4} />;
}
