import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import Navigation from "@/components/Navigation";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Control Center — Personal Task Manager",
  description:
    "A smart personal dashboard with task management, Reddit feed, Telegram reminders, voice assistant, and calendar view.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="antialiased bg-background text-foreground">
        <Navigation />
        {children}
      </body>
    </html>
  );
}

