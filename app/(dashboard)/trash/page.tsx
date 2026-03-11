import { getTrash } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { TrashBrowser } from "@/components/files/trash-browser";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const items = await getTrash();

  return (
    <>
      <PageHeader
        title="Trash"
        description="Items moved here are not permanently deleted"
      />
      <TrashBrowser items={items} />
    </>
  );
}
