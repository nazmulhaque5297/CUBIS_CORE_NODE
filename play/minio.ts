import * as Minio from "minio";
import path from "path";

const minioClient = new Minio.Client({
  endPoint: "play.min.io",
  port: 9000,
  useSSL: true,
  accessKey: "Q3AM3UQ867SPQQA43P2F",
  secretKey: "zuf+tfteSlswRu7BJ86wekitnifILbZam1KYY3TG",
});

async function main(name: string) {
  const res = await minioClient.makeBucket(name, "us-east-1");
}

main("rdcd-loan");
