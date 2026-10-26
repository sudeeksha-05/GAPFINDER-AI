import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { LandingContent } from "@/components/landing/landing-content";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <LandingContent />
      </main>
      <SiteFooter />
    </>
  );
}
