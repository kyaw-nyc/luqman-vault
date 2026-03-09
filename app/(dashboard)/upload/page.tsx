import { PageHeader } from "@/components/layout/page-header";
import { UploadZone } from "@/components/upload/upload-zone";

export default function UploadPage() {
  return (
    <>
      <PageHeader
        title="Upload Files"
        description="Upload files to your server storage"
      />
      <UploadZone />
    </>
  );
}
