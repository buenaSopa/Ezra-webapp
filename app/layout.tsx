import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Toaster } from "sonner";
import dynamic from 'next/dynamic';

const NextNProgressClient = dynamic(() => import('@/app/components/NextNProgressClient'), { ssr: false });

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Ezra - AI Powered Marketing Assistant",
  description: "AI-powered tool for creative strategists to streamline research, ideation, and ad script creation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body className="bg-background text-foreground">
        <NextNProgressClient />
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
