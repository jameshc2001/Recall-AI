import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Recall AI",
  description: "Generate and practice flashcard decks with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}})();`,
          }}
        />
      </head>
      <body className={`${geist.className} bg-neutral-50 text-neutral-900 min-h-screen dark:bg-neutral-900 dark:text-neutral-100`}>
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
