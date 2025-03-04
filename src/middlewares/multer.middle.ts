import multer, { Multer, StorageEngine } from "multer";
import BadRequestError from "../errors/bad-request.error";

export const uploadFile = multer({
  limits: {
    fileSize: 1024 * 1024, //1024kb
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "image/jpg" ||
      file.mimetype === "image/png" ||
      file.mimetype === "image/jpeg" ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(new BadRequestError("Invalid file type/size"));
    }
  },
});
