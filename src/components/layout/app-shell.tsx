import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DemoDataNotice } from "@/components/ui/demo-data-notice";
import { PageContainer } from "@/components/ui/page-container";

export function AppShell({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="min-h-screen bg-[#080a12]">
      <AppSidebar />
      <div className="lg:pl-[252px]">
        <AppHeader title={title} />
        <PageContainer>
          <DemoDataNotice />
          <main className="mt-7">{children}</main>
          <footer className="mt-12 border-t border-white/[0.06] pt-5 text-xs text-slate-500">
            GapFinder AI · Product interface preview · Demo data only
          </footer>
        </PageContainer>
      </div>
    </div>
  );
}
