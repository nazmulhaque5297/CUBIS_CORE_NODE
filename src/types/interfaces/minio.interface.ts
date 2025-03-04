export interface IMinioConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
}

export interface IPutObject {
  fileName: string;
  buffer: Buffer;
}

export interface IGetObject {
  fileName: string;
}
