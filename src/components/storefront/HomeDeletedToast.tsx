"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { dispatchStoreToast } from "@/components/store/StoreToaster";

export function HomeDeletedToast() {
  const sp = useSearchParams();

  useEffect(() => {
    if (sp.get("deleted") !== "true") return;
    dispatchStoreToast("Your account has been deleted.", { duration: 5000 });
    window.history.replaceState({}, "", "/");
  }, [sp]);

  return null;
}
