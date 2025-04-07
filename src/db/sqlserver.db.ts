import sql from "mssql";

export interface ISQLCredentials {
    user: string;
    password: string;
    server: string;
    database: string;
    port?: number;
    options?: {
        encrypt: boolean;
        trustServerCertificate: boolean;
    };
}

export type DBType = "master" | "slave" | "log" | "archive";

export default class SQLConnection {
    private pool: sql.ConnectionPool;
    private type: string;

    constructor(creds: ISQLCredentials, type: DBType) {
        this.type = type;
        this.pool = new sql.ConnectionPool({
            user: creds.user,
            password: creds.password,
            server: creds.server,
            database: creds.database,
            port: creds.port || 1433,
            options: creds.options || { encrypt: true, trustServerCertificate: true }
        });
    }

    async connect(): Promise<void> {
        await this.pool.connect();
    }

    getPool(): sql.ConnectionPool {
        return this.pool;
    }

    getDBType(): string {
        return this.type;
    }

    async ping(): Promise<boolean> {
        await this.pool.request().query("SELECT 1");
        return true;
    }
}
