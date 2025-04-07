export interface SQLServerCredentials {
  user: string;
  server: string;
  database: string;
  password: string;
  port: number;
  dbType:string;
  options?: {
    encrypt?: boolean;
    trustServerCertificate?: boolean;
  };
}

export abstract class BaseConnection {
  protected slaveCredentials: SQLServerCredentials[];
  protected masterCredentials: SQLServerCredentials;
  protected archiveCredentials: SQLServerCredentials;
  protected logCredentials: SQLServerCredentials;

  constructor(credentials: SQLServerCredentials | SQLServerCredentials[]) {
    if (Array.isArray(credentials)) {
      this.slaveCredentials = credentials;
    } else if (!Array.isArray(credentials) && credentials.dbType == "archive") {
      this.archiveCredentials = credentials;
    } else if (credentials.dbType == "log") {
      this.logCredentials = credentials;
    } else {
      this.masterCredentials = credentials;
    }
  }
  async connect(): Promise<any> {}
}
