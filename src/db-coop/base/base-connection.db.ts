export interface PGCredentials {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
  dbType: string;
}

export abstract class BaseConnection {
  protected slaveCredentials: PGCredentials[];
  protected masterCredentials: PGCredentials;
  protected archiveCredentials: PGCredentials;
  protected logCredentials: PGCredentials;

  constructor(credentials: PGCredentials | PGCredentials[]) {
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
