import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

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
      <body className="bg-background text-foreground dark">
        <SidebarProvider>
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}
