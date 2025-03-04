/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2023-06-14 10:31:43
 * @modify date 2023-06-14 10:31:43
 * @desc [description]
 */

import path from "path";
import { v4 as uuidv4 } from "uuid";

/**
 * Generates a unique file name using a UUID and the original file extension.
 *
 * @param {Express.Multer.File} file - The file object obtained from Multer middleware.
 * @returns {string} - The generated file name.
 */
export const getFileName = (file: Express.Multer.File | string): string => {
  const uuid = uuidv4();
  let extension = "";
  if (typeof file == "string") {
    extension = path.extname(file);
  } else extension = path.extname(file.originalname);

  return `${uuid}${extension}`;
};
