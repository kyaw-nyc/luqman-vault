import {
  Folder,
  File,
  FileText,
  FileCode,
  Image,
  Film,
  Archive,
  Terminal,
  FileSpreadsheet,
} from "lucide-react";

const iconMap: Record<string, { icon: typeof File; color: string }> = {
  md: { icon: FileText, color: "text-emerald-400/80" },
  txt: { icon: FileText, color: "text-zinc-500" },
  pdf: { icon: FileText, color: "text-red-400/80" },
  doc: { icon: FileText, color: "text-blue-400/80" },
  docx: { icon: FileText, color: "text-blue-400/80" },
  yaml: { icon: FileCode, color: "text-amber-400/80" },
  yml: { icon: FileCode, color: "text-amber-400/80" },
  json: { icon: FileCode, color: "text-amber-400/80" },
  ts: { icon: FileCode, color: "text-blue-400/80" },
  tsx: { icon: FileCode, color: "text-blue-400/80" },
  js: { icon: FileCode, color: "text-yellow-400/80" },
  py: { icon: FileCode, color: "text-blue-400/80" },
  sh: { icon: Terminal, color: "text-emerald-400/80" },
  bash: { icon: Terminal, color: "text-emerald-400/80" },
  jpg: { icon: Image, color: "text-violet-400/80" },
  jpeg: { icon: Image, color: "text-violet-400/80" },
  png: { icon: Image, color: "text-violet-400/80" },
  gif: { icon: Image, color: "text-violet-400/80" },
  webp: { icon: Image, color: "text-violet-400/80" },
  svg: { icon: Image, color: "text-violet-400/80" },
  mp4: { icon: Film, color: "text-pink-400/80" },
  mov: { icon: Film, color: "text-pink-400/80" },
  mkv: { icon: Film, color: "text-pink-400/80" },
  zip: { icon: Archive, color: "text-amber-400/80" },
  tar: { icon: Archive, color: "text-amber-400/80" },
  gz: { icon: Archive, color: "text-amber-400/80" },
  rar: { icon: Archive, color: "text-amber-400/80" },
  xlsx: { icon: FileSpreadsheet, color: "text-green-400/80" },
  xls: { icon: FileSpreadsheet, color: "text-green-400/80" },
  csv: { icon: FileSpreadsheet, color: "text-green-400/80" },
};

export function FileIcon({
  name,
  isDirectory,
}: {
  name: string;
  isDirectory: boolean;
}) {
  if (isDirectory) {
    return <Folder className="h-4 w-4 text-blue-400/70" />;
  }

  const ext = name.split(".").pop()?.toLowerCase() || "";
  const config = iconMap[ext] || { icon: File, color: "text-zinc-600" };
  const Icon = config.icon;
  return <Icon className={`h-4 w-4 ${config.color}`} />;
}
