import type { ReactNode } from "react";

export function PageContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-[1440px] px-4 pb-10 pt-6 sm:px-6 lg:px-9 ${className}`}>{children}</div>;
}
