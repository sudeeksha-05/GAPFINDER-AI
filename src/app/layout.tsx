import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { StudyDemoProvider } from "@/components/study-demo-provider";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GapFinder AI | Discover What You Don't Know",
    template: "%s | GapFinder AI",
  },
  description:
    "Discover your knowledge gaps, understand what you're missing, and find a clearer path to learning.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <StudyDemoProvider>{children}</StudyDemoProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
