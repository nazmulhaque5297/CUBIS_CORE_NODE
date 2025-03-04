import { Pool } from "pg"

export interface IPGCredentials {
    user: string;
    host: string;
    database: string;
    password: string;
    port: number;
}

export type DBType = "master" | "slave" | "log"| "archive";

export default class PGConnection {
    private pool: Pool;
    private type: string;

    constructor(creds: IPGCredentials, type: DBType) {
        this.type = type;
        this.pool = new Pool({ ...creds });
    }

    getPool() : Pool{
        return this.pool;
    }

    getDBType() : string{
        return this.type;
    }

    async ping() : Promise<Boolean> {
        await this.pool.query("SELECT NOW()");
        return true;
    }
}


