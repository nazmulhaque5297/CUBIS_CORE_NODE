/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-01 11:07:42
 * @modify date 2021-11-01 11:07:42
 * @desc [description]
 */

import { NextFunction, Request, Response } from "express";
import _, { get } from "lodash";
import * as Minio from "minio";
import { minioBucketName, objectStorage } from "../configs/app.config";
import { minioClient } from "../db/minio.db";
import { IPutObject } from "../types/interfaces/minio.interface";
import { getFileName } from "./file.util";
import { getPaths } from "./json-path.utils";
import { obsPresignedGet, obsUpload, obsUploadObject } from "./obs.util";

/**
 * @param  {Request} req
 * @param  {Response} res
 * @param  {NextFunction} next
 */

export const minioUpload = async (req: Request, res: Response, next: NextFunction) => {
  console.log("here in obs");
  if (objectStorage == "obs") {
    return await obsUpload(req, res, next);
  }

  if (typeof req.files === "object") {
    const files: any = {};
    const fieldNames = Object.keys(req.files);

    for await (const fieldName of fieldNames) {
      //@ts-ignore
      const file: Express.Multer.File = req.files[fieldName][0];

      const fileName = getFileName(file);

      await minioClient.putObject(minioBucketName, fileName, file.buffer);

      const url = await minioClient.presignedGetObject(minioBucketName, fileName);

      files[fieldName] = fileName;
      files[fieldName + "Url"] = url;
    }

    req.body = { ...req.body, ...files };
  }
  next();
};

export const uploadObject = async (options: IPutObject): Promise<Minio.UploadedObjectInfo> => {
  if (objectStorage == "obs") return (await obsUploadObject(options)) as unknown as Minio.UploadedObjectInfo;
  return await minioClient.putObject(minioBucketName, options.fileName, options.buffer);
};

/**
 * @param  {string} value
 * @returns null
 */
const getUrl = async (value: string) => {
  return value ? await minioClient.presignedGetObject(minioBucketName, value) : null;
};

/**
 * @description This function is used to get presigned urls for multiple files upload of minio
 * @param  {any|any[]} objects object or array of objects which needs to be converted to url
 * @param  {string[]} keys keys of the object which needs to be converted to url
 * @returns {any|any[]} object or array of objects with converted to url
 */
export const minioPresignedGet = async (objects: any | any[], keys: string[]): Promise<any | any[]> => {
  if (objectStorage == "obs") {
    return await obsPresignedGet(objects, keys);
  }

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

/**
 * @description This function is used to delete file from minio
 * @param  {any} object Object which has keys to be deleted
 * @param  {string[]} keys  Keys to be deleted
 * @returns {any} Object with deleted keys
 */
export const minioObjectDelete = async (object: any, keys: string[]): Promise<any> => {
  keys.map(async (key: string) => {
    if (object[key]) {
      await minioClient.removeObject(minioBucketName, object[key]);
      object[key] = null;
    }
  });

  return object;
};
