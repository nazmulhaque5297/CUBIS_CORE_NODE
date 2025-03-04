export interface pageDataAttrs {
  id?: number;
  doptorId?: number;
  samityId?: number;
  pageId?: number;
  contentType?: number;
  data?: string;
  serialNo?: number;
  status?: string;
  attachment?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}

export interface pageDataInput {
  samityId?: number;
  pageId: number;
  contentId: number;
  content: number;
  documents?: Document[];
}

export interface pageDataUpdate extends pageDataInput {
  updatedBy: string;
}

export interface Document {
  name: string;
  mimeType: string;
  base64Image: string;
  oldFileName?: string;
}
