import type { Metadata } from "next";
import "./globals.css";
import { Syne } from "next/font/google";
import { ToastContainer } from "@/components/ui/toast";

const syne = Syne({ subsets: ["latin"], variable: "--font-display", display: "swap" });

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Festival Planner";

export const metadata: Metadata = {
  title: appName,
  description: "Group based planning for festival days, notes and live timelines."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning className={syne.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
              var a=localStorage.getItem('accent');
              if(a==='warm')document.documentElement.classList.add('accent-warm');
              var t=localStorage.getItem('theme');
              var d=window.matchMedia('(prefers-color-scheme: dark)').matches;
              if(t==='dark'||(!t&&d)){document.documentElement.classList.add('dark');}
              else{document.documentElement.classList.remove('dark');}
            }catch(e){}})();`
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground transition-colors duration-200">
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
