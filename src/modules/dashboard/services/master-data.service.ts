/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-06-15 12:19:15
 * @modify date 2022-06-15 12:19:15
 * @desc [description]
 */

import axios from "axios";
import { buildUpsertSql } from "rdcd-common";
import Container, { Service } from "typedi";
import { dashboardUrl } from "../../../configs/app.config";
import pgConnect from "../../../db/connection.db";
import { ComponentType } from "../../../interfaces/component.interface";
import { MasterDataServices } from "../../../modules/master/services/master-data-coop.service";
import { Dashboard } from "./dashboard.service";

@Service()
export class MasterDataSyncService extends Dashboard {
  constructor(component: ComponentType) {
    super(component);
  }

  async getMasterData() {
    const response = await axios.get(`${dashboardUrl}/api/v1/master-data`, await this.getConfig());

    if (response.status == 200) {
      return response.data as Array<any>;
    }

    return [];
  }

  async syncMasterData() {
    const data = await this.getMasterData();

    const connection = await pgConnect.getConnection("master");

    for await (const d of data) {
      const { sql, params } = buildUpsertSql(
        "master.code_master",
        "id",
        {
          ...d,
          createdBy: "dashboard",
          createdAt: new Date(),
        },
        {
          updatedBy: "dashboard",
          updatedAt: new Date(),
        },
        ["createdAt", "createdBy"]
      );

      await connection.query(sql, params);
    }
  }

  async sendMasterData() {
    const masterDataService = Container.get(MasterDataServices);
    const masterData = await masterDataService.getAll();
    const config = await this.getConfig();

    const data = [];

    for await (const m of masterData) {
      data.push(this.createMasterDataPayload(m));
    }

    try {
      const response = await axios.post(`${dashboardUrl}/api/v1/request/master-data`, { data }, config);

      console.log(response.data);
    } catch (error) {
      console.log(error);
    }

    return `${masterData.length} data send to dashboard`;
  }

  createMasterDataPayload(masterData: any) {
    return {
      id: masterData.id,
      code_type: masterData.codeType,
      return_value: masterData.returnValue,
      display_value: masterData.displayValue,
      is_active: masterData.isActive,
    };
  }
}
