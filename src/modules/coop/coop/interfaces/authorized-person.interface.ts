/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-30 13:38:43
 * @modify date 2021-11-30 13:38:43
 * @desc [description]
 */

export interface AuthorizedPersonInputAttrs {
  userId: number;
  samityId: number;
  effectDate: Date;
}

export interface AuthorizedPersonAttrs extends AuthorizedPersonInputAttrs {
  id: number;
  createdAt: Date;
  updatedAt: Date | null;
  createdBy: string;
  updatedBy: string | null;
}
