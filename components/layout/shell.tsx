import { Sidebar } from "./sidebar";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-[260px] min-h-screen">
        <div className="mx-auto max-w-[1200px] px-10 py-10">{children}</div>
      </main>
    </div>
  );
}
