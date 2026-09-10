import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Le middleware protège déjà les routes non authentifiées ; ce garde-fou ne sert qu'en filet
// de sécurité si getCurrentUserId est appelée depuis un contexte que le middleware ne couvre pas.
export const getCurrentUserId = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
});
