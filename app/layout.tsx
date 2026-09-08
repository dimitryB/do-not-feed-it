import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Do Not Feed It", description: "Feed the creature. Deal with what it becomes. A Hemi arcade game in development." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
