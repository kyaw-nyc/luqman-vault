export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: string;
  extension: string | null;
  mimeType: string | null;
}

export interface SearchResult extends FileItem {
  parentPath: string;
}

export interface TrashItem {
  id: string;
  name: string;
  originalPath: string;
  trashedName: string;
  trashedAt: string;
  isDirectory: boolean;
  size: number;
}
