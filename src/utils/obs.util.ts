/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-01 11:07:42
 * @modify date 2021-11-01 11:07:42
 * @desc [description]
 */

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextFunction, Request, Response } from "express";
import _, { get } from "lodash";
import { obsBucketName } from "../configs/app.config";
import { IPutObject } from "../types/interfaces/minio.interface";
import { getFileName } from "./file.util";
import { getPaths } from "./json-path.utils";

import { liveIp } from "../configs/coop.config";
import { s3Client } from "../db/obs.db";

/**
 * @param  {Request} req
 * @param  {Response} res
 * @param  {NextFunction} next
 */

export const obsUpload = async (req: Request, res: Response, next: NextFunction) => {
  if (typeof req.files === "object") {
    const files: any = {};
    const fieldNames = Object.keys(req.files);

    for await (const fieldName of fieldNames) {
      //@ts-ignore
      const file: Express.Multer.File = req.files[fieldName][0];

      const fileName = getFileName(file);

      const command = new PutObjectCommand({ Body: file.buffer, Bucket: obsBucketName, Key: fileName });

      const response = await s3Client.send(command);

      console.log({ response });

      files[fieldName] = fileName;
      files[fieldName + "Url"] = getUrl(fileName);
    }

    req.body = { ...req.body, ...files };
  }
  next();
};

export const obsUploadObject = async (options: IPutObject) => {
  const command = new PutObjectCommand({ Body: options.buffer, Bucket: obsBucketName, Key: options.fileName });

  await s3Client.send(command);

  return getUrl(options.fileName);
};

/**
 * @param  {string} value
 * @returns null
 */
const getUrl = async (value: string) => {
  return value ? buildResourceUrl(value) : null;
};

/**
 * @description This function is used to get presigned urls for multiple files upload of minio
 * @param  {any|any[]} objects object or array of objects which needs to be converted to url
 * @param  {string[]} keys keys of the object which needs to be converted to url
 * @returns {any|any[]} object or array of objects with converted to url
 */
export const obsPresignedGet = async (objects: any | any[], keys: string[]): Promise<any | any[]> => {
  let obj: any;
  const paths = getPaths(objects, keys);

  for await (const p of paths) {
    const value = get(objects, p);
    const url = await getUrl(value);

    const path = p + "Url";

    obj = _.set(objects, path, url);
  }

  return obj;
};

export const buildResourceUrl = (value: string) => liveIp + "/uploads/" + value;
