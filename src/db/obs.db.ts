/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-10-31 15:32:35
 * @modify date 2021-10-31 15:32:35
 * @desc [description]
 */

import { ListBucketsCommand, S3Client } from "@aws-sdk/client-s3";
import { obsAccessKey, obsEndPoint, obsRegion, obsSecretKey } from "../configs/app.config";

export const s3Client = new S3Client({
  endpoint: obsEndPoint,
  apiVersion: "latest",
  region: obsRegion,
  credentials: {
    accessKeyId: obsAccessKey,
    secretAccessKey: obsSecretKey,
  },
});

export const listOBSBuckets = async () => {
  const command = new ListBucketsCommand({});
  try {
    const { Buckets } = await s3Client.send(command);
    console.log(`[INFO] Connected to OBS. Existing Buckets: ${Buckets?.map((b) => `\n • ${b.Name}`)}`);
  } catch (err) {
    console.error("[ERROR] Unable to list OBS buckets:", err);
  }
};
