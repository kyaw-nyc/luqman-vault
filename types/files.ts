export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: string;
  extension: string | null;
  mimeType: string | null;
}
