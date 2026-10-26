"use client";

import { AccountErrorState } from "@/components/auth/account-states";

export default function WorkspaceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AccountErrorState reset={reset} />;
}
