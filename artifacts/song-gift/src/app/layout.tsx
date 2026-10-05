import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "Song Gift — Your story, set to music",
    template: "%s · Song Gift",
  },
  description:
    "Turn your favourite memories into a one-of-a-kind song gift. Tell the story, shape the lyrics, and share something they'll keep forever.",
  openGraph: {
    title: "Song Gift — Your story, set to music",
    description:
      "A personal story. A song made just for them. Give a gift that sounds like you.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}