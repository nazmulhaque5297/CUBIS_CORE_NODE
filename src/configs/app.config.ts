import fs from "fs";
import path from "path";
import { ComponentType } from "./../interfaces/component.interface";
//import { IMinioConfig } from "../types/interfaces/minio.interface";
import { IAppDBCredentials } from "../db/connection.db";

const configPath = path.resolve(__dirname + "/../../appconfig.json");
export const appConf: any = JSON.parse(fs.readFileSync(configPath, "utf-8"));

export function getPort() {
  return Number(appConf.port) || 8090;
}

export function getDB(): IAppDBCredentials {
  return appConf.database;
}

export function getAdminCreds() {
  return appConf.admin;
}

export type JwtType = "dev" | "app" | "temp" | "shared" | "citizen";
export function getJWTSecret(type: JwtType) {
  switch (type) {
    case "dev":
      return appConf.jwtSecretDev;
    case "app":
      return appConf.jwtSecretApp;
    case "temp":
      return appConf.jwtSecretTemp;
    case "shared":
      return appConf.jwtSecretShared;
    case "citizen":
      return appConf.jwtSecretCitizen;
    default:
      return appConf.jwtSecretApp;
  }
}

export function getSSOCreatedBy() {
  return "$SSO";
}

export function getFileUploadPath() {
  return appConf.fileUploadPath;
}

// export function getMinioBucketName() {
//     return appConf.minio.bucket;
// }

// export function getMinioConfig(): IMinioConfig{
//     return appConf.minio.connection;
// }

//minio
export const minioSecretKey: string = appConf.minio.secretKey;
export const minioRegion: string = appConf.minio.region;
export const minioEndPoint: string = appConf.minio.endPoint;
export const minioPort: number = appConf.minio.port;
export const minioAccessKey: string = appConf.minio.accessKey;
export const minioBucketName: any = appConf.minio.bucket;
export const minioUseSSL: any = appConf.minio.useSSL;

//obs
export const obsSecretKey: string = appConf.obs.secretKey;
export const obsRegion: string = appConf.obs.region;
export const obsEndPoint: string = appConf.obs.endPoint;
export const obsAccessKey: string = appConf.obs.accessKey;
export const obsBucketName: any = appConf.obs.bucket;

//jasper
export const jasperEndpoint = appConf.jasper.endPoint;
export const jasperUsername = appConf.jasper.username;
export const jasperPassword = appConf.jasper.password;

//moment js timezone and time format
export const defaultTimezone = "Asia/Dhaka";
export const defaultDateFormat = "YYYY/MM/DD";

//component id - for component separation.
export function getComponentId(componentName: ComponentType) {
  return appConf.component[componentName] as number;
}

//dashboard url
export const dashboardUrl = appConf.dashboardCreds.url;
export const dashboardGrantType = appConf.dashboardCreds.grantType;

export function getDashboardClientCreds(componentName: ComponentType) {
  const dashboardCred = appConf.dashboardCreds.clients[componentName];
  return {
    dashboardClientId: dashboardCred.id,
    dashboardClientSecret: dashboardCred.secret,
  };
}

export const objectStorage = appConf.objectStorage as "minio" | "obs";
