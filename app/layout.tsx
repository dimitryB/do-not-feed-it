import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Do Not Feed It", description: "Feed it your tokens. Deal with what it becomes. A fan-made Hemi Arcade game in development." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
