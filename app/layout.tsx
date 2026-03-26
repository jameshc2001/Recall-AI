import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

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
    <html lang="en">
      <body className={`${geist.className} bg-neutral-50 text-neutral-900 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
