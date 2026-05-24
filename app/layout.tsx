import type { Metadata } from "next";
import "./globals.css";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Festival Planner";

export const metadata: Metadata = {
  title: appName,
  description: "Group based planning for festival days, notes and live timelines."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  const supportDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (theme === 'dark' || (!theme && supportDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
