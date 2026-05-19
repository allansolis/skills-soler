import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { NotificationChecker } from "@/components/shared/NotificationChecker";
import { BusinessProvider } from "@/context/BusinessContext";
import { getBusinessFromCookies } from "@/lib/getBusinessFromCookies";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRM SOLER - Centro de control multi-marca",
  description:
    "CRM conversacional con pipeline de ventas, clasificacion automatica de leads y seguimiento inteligente. Construido con Claude Code.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Leer business desde cookie en server para que el Provider arranque con el valor correcto
  // y evitar el flash visual / hydration mismatch entre server y client.
  const initialBusiness = await getBusinessFromCookies();

  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark")document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex" suppressHydrationWarning>
        <BusinessProvider initialBusiness={initialBusiness}>
          <TooltipProvider>
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-screen">
              <Header />
              <main className="flex-1 p-4 md:p-6 bg-background overflow-auto">
                {children}
              </main>
            </div>
            <Toaster />
            <NotificationChecker />
          </TooltipProvider>
        </BusinessProvider>
      </body>
    </html>
  );
}
