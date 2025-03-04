import { ComponentType } from "./../../../interfaces/component.interface";
/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-10-06 11:53:11
 * @modify date 2022-10-06 11:53:11
 * @desc :::::::::::::IMPORTANT:::::::::::::
 * *** why I created another class for same task (jasper documents and samity certificate)?
 * --- samity certificate class was introduced at the initial stage of the project.
 *     We were unaware of the reusing it to the other components. Because of time limitation,
 *     I did not refactor the initial class rather created new simple class that can be used to
 *     other components freely. If you feel insecure, feel free to refactor the class and merge both
 *     into one class and introduce inheritance.
 */

import axios, { AxiosRequestConfig } from "axios";
import { Service } from "typedi";
import { jasperEndpoint, jasperPassword, jasperUsername } from "../../../configs/app.config";
import db from "../../../db/connection.db";

@Service()
export class JasperDocService {
  constructor() {}
  createLink(urlQuery: Object, docName: string, componentName: ComponentType): AxiosRequestConfig {
    return {
      baseURL: jasperEndpoint + componentName + "/",
      url: docName,
      responseType: "arraybuffer",
      params: {
        j_username: jasperUsername,
        j_password: jasperPassword,
        ...urlQuery,
      },
    };
  }

  async getDoc(urlQuery: any, docName: string, componentName: ComponentType) {
    let pUserName;
    if (Number(urlQuery?.pUserName)) {
      const getUserNameSql = `SELECT name FROM users.user WHERE id = $1`;
      pUserName = (await db.getConnection("slave").query(getUserNameSql, [urlQuery.pUserName])).rows[0]?.name;
    }
    urlQuery = { ...urlQuery, pUserName: pUserName ? pUserName : "" };
    try {
      return await axios.request(this.createLink(urlQuery, docName, componentName));
    } catch (error) {
      console.log(error);

      return null;
    }
  }
}
