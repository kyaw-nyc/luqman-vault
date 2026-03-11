import { BACKEND_URL } from "@/lib/backend";
import { PageHeader } from "@/components/layout/page-header";
import { SmartViewBrowser } from "@/components/files/smart-view-browser";

export const dynamic = "force-dynamic";

const VIEW_META: Record<string, { title: string; description: string }> = {
  recent: {
    title: "Recent Files",
    description: "Files modified in the last 7 days",
  },
  large: {
    title: "Large Files",
    description: "Files larger than 50 MB",
  },
  images: {
    title: "All Images",
    description: "Image files across all folders",
  },
  documents: {
    title: "Documents",
    description: "PDFs, docs, spreadsheets, and text files",
  },
  versioned: {
    title: "Files with Versions",
    description: "Files that have saved version history",
  },
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SmartViewPage({ params }: PageProps) {
  const { slug } = await params;
  const meta = VIEW_META[slug];

  if (!meta) {
    return (
      <>
        <PageHeader title="Unknown View" description="This view does not exist." />
        <p className="text-sm text-zinc-600">Try one of the available views in the sidebar.</p>
      </>
    );
  }

  let files: unknown[] = [];
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/smart-view?type=${encodeURIComponent(slug)}`,
      { cache: "no-store" },
    );
    if (res.ok) {
      files = await res.json();
    }
  } catch { /* fallback to empty */ }

  return (
    <>
      <PageHeader title={meta.title} description={meta.description} />
      <SmartViewBrowser files={files as never[]} viewType={slug} />
    </>
  );
}
