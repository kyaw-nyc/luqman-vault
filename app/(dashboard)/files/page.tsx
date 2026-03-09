import { getFiles } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/files/breadcrumbs";
import { FileBrowser } from "@/components/files/file-browser";

export default async function FilesPage(props: {
  searchParams: Promise<{ path?: string }>;
}) {
  const searchParams = await props.searchParams;
  const currentPath = searchParams.path || "/";
  const files = await getFiles(currentPath);

  return (
    <>
      <PageHeader
        title="Files"
        description="Browse and manage server storage"
      />
      <div className="mb-5">
        <Breadcrumbs path={currentPath} />
      </div>
      <FileBrowser files={files} currentPath={currentPath} />
    </>
  );
}
