"use client";

import { AccountErrorState } from "@/components/auth/account-states";

export default function OnboardingError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="site-shell flex min-h-screen items-center py-12">
      <AccountErrorState reset={reset} />
    </main>
  );
}
