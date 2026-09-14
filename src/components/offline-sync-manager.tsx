"use client";

import { useOfflineSync } from "@/lib/offline/sync";

export function OfflineSyncManager() {
  useOfflineSync();
  return null;
}
