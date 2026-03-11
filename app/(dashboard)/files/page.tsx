import { getFiles } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/files/breadcrumbs";
import { FileBrowser } from "@/components/files/file-browser";
import { LiveIndicator } from "@/components/ui/live-indicator";

export const dynamic = "force-dynamic";

export default async function FilesPage(props: {
  searchParams: Promise<{ path?: string }>;
}) {
  const searchParams = await props.searchParams;
  const currentPath = searchParams.path || "/";
  const files = await getFiles(currentPath);
  const now = Date.now();

  return (
    <>
      <PageHeader
        title="Files"
        description="Browse and manage server storage"
        right={
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              {[
                { key: "/", label: "search" },
                { key: "n", label: "new folder" },
                { key: "u", label: "upload" },
                { key: "⌘A", label: "select all" },
              ].map(({ key, label }) => (
                <span key={key} className="flex items-center gap-1 font-mono text-[10px] text-zinc-700">
                  <kbd className="rounded border border-zinc-800 px-1 py-0.5 text-[9px]">{key}</kbd>
                  {label}
                </span>
              ))}
            </div>
            <LiveIndicator interval={15_000} serverTimestamp={now} />
          </div>
        }
      />
      <div className="mb-5 overflow-x-auto">
        <Breadcrumbs path={currentPath} />
      </div>
      <FileBrowser files={files} currentPath={currentPath} />
    </>
  );
}
