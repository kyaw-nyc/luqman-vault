import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { CommandPalette } from "./command-palette";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <CommandPalette />
      <BottomNav />
      <main className="min-h-screen md:ml-[260px]">
        <div className="mx-auto max-w-[1200px] px-5 py-6 pb-28 md:px-10 md:py-10 md:pb-10">
          {children}
        </div>
      </main>
    </div>
  );
}
