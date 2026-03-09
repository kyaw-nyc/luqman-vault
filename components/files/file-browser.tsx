import Link from "next/link";
import type { FileItem } from "@/types/files";
import { FileIcon } from "./file-icon";
import { formatBytes, formatDateCompact } from "@/lib/formatters";
import { Download, FolderOpen } from "lucide-react";

export function FileBrowser({
  files,
  currentPath,
  apiBase,
}: {
  files: FileItem[];
  currentPath: string;
  apiBase: string;
}) {
  const sorted = [...files].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  const dirCount = sorted.filter((f) => f.isDirectory).length;
  const fileCount = sorted.length - dirCount;

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800/50 py-24">
        <FolderOpen className="mb-4 h-10 w-10 text-zinc-800" />
        <p className="text-[13px] text-zinc-600">This folder is empty</p>
        {currentPath !== "/" && (
          <Link
            href="/files"
            className="mt-3 text-[13px] text-emerald-500/70 transition-colors hover:text-emerald-400"
          >
            Back to root
          </Link>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-zinc-800/40">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800/40 bg-zinc-900/30">
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-zinc-600">
                Name
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-zinc-600 max-sm:hidden">
                Size
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-zinc-600 max-sm:hidden">
                Modified
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-zinc-600 max-sm:hidden">
                Type
              </th>
              <th className="w-12 px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/20">
            {sorted.map((file) => (
              <tr
                key={file.path}
                className="group transition-colors hover:bg-zinc-800/15"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <FileIcon
                      name={file.name}
                      isDirectory={file.isDirectory}
                    />
                    {file.isDirectory ? (
                      <Link
                        href={`/files?path=${encodeURIComponent(file.path)}`}
                        className="text-[13px] font-medium text-zinc-200 transition-colors hover:text-emerald-400"
                      >
                        {file.name}
                      </Link>
                    ) : (
                      <span className="text-[13px] text-zinc-400">
                        {file.name}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3.5 font-mono text-[12px] text-zinc-600 max-sm:hidden">
                  {file.isDirectory ? "\u2014" : formatBytes(file.size)}
                </td>
                <td className="px-5 py-3.5 text-[12px] text-zinc-600 max-sm:hidden">
                  {formatDateCompact(file.modifiedAt)}
                </td>
                <td className="px-5 py-3.5 font-mono text-[12px] text-zinc-600 max-sm:hidden">
                  {file.isDirectory
                    ? "dir"
                    : (file.extension?.toLowerCase() || "\u2014")}
                </td>
                <td className="px-5 py-3.5 text-right">
                  {!file.isDirectory && (
                    <a
                      href={`${apiBase}/api/download?path=${encodeURIComponent(file.path)}`}
                      download={file.name}
                      className="inline-flex rounded-md p-1.5 text-zinc-700 opacity-0 transition-all group-hover:opacity-100 hover:bg-zinc-800/50 hover:text-zinc-400"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 px-2">
        <p className="font-mono text-[11px] text-zinc-700">
          {dirCount > 0 && `${dirCount} folder${dirCount !== 1 ? "s" : ""}`}
          {dirCount > 0 && fileCount > 0 && ", "}
          {fileCount > 0 && `${fileCount} file${fileCount !== 1 ? "s" : ""}`}
        </p>
      </div>
    </div>
  );
}
