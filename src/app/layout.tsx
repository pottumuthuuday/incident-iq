import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IncidentIQ — Remember Every Incident. Resolve the Next One Faster.",
  description:
    "AI Incident Response Agent for engineering and DevOps teams. IncidentIQ retains incident memory in Hindsight and recalls it to resolve future incidents faster.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
