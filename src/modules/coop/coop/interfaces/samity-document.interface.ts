/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-04 12:00:11
 * @modify date 2021-11-04 12:00:11
 * @desc [description]
 */

export interface SamityDocumentInputAttrs {
  samityId: number;
  documentId: number;
  expireDate?: Date | null;
  effectDate?: Date | null;
  documentNo?: string;
  documentNameUrl?: string;
  documentName?: string;
}

export interface SamityDocumentAttrs extends SamityDocumentInputAttrs {
  id?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}

export interface SamityDocumentUpdateInputAttrs {
  id?: string;
  documentName?: string;
  documentId: number;
  expireDate?: Date | null;
  effectDate?: Date | null;
  documentNo?: string;
  updatedBy?: string;
  updatedAt?: Date;
}
