import { Suspense } from "react";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { CommandPalette } from "./command-palette";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Suspense>
        <Sidebar />
      </Suspense>
      <CommandPalette />
      <BottomNav />
      <main className="min-h-screen md:ml-[260px]">
        <div
          className="mx-auto max-w-[1200px] px-4 py-5 pb-24 sm:px-5 md:px-10 md:py-10 md:pb-10"
          style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
