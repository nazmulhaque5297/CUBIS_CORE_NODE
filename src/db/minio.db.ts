/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-10-31 15:32:35
 * @modify date 2021-10-31 15:32:35
 * @desc [description]
 */

import { Client } from "minio";
import {
  minioAccessKey,
  minioEndPoint,
  minioPort,
  minioRegion,
  minioSecretKey,
  minioUseSSL,
} from "../configs/app.config";

export const minioClient = new Client({
  endPoint: minioEndPoint,
  port: minioPort,
  useSSL: minioUseSSL,
  accessKey: minioAccessKey,
  secretKey: minioSecretKey,
  region: minioRegion,
});

export const createBucket = async (bucket: string) => {
  const existingBucket = await minioClient.bucketExists(bucket);

  existingBucket || (await minioClient.makeBucket(bucket, "us-east-1"));

  console.log(`[INFO] Connected to Minio: ${bucket} Bucket`);
};
