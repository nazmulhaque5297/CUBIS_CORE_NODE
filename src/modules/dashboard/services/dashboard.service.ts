/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-04-20 13:22:44
 * @modify date 2022-04-20 13:22:44
 * @desc [description]
 */

import axios, { AxiosRequestConfig } from "axios";
import { BadRequestError } from "rdcd-common";
import { dashboardGrantType, dashboardUrl, getComponentId, getDashboardClientCreds } from "../../../configs/app.config";
import { ComponentType } from "./../../../interfaces/component.interface";

export class Dashboard {
  private token: string;
  private config: AxiosRequestConfig;
  protected component: ComponentType;
  protected componentId: number;
  protected dashboardCreds: {
    dashboardClientId: any;
    dashboardClientSecret: any;
  };

  constructor(component: ComponentType) {
    this.component = component;
    this.componentId = getComponentId(component);
    this.dashboardCreds = getDashboardClientCreds(component);
  }

  async getToken() {
    try {
      const response = await axios.post(`${dashboardUrl}/api/v1/oauth/token`, {
        grant_type: dashboardGrantType,
        client_id: this.dashboardCreds.dashboardClientId,
        client_secret: this.dashboardCreds.dashboardClientSecret,
      });

      this.token = response.data.access_token;
    } catch (error: any) {
      this.throwError(error);
    }
  }

  /**
   *
   * @param componentName
   * @returns
   */
  async getConfig() {
    if (!this.token) {
      await this.getToken();
    }
    this.config = {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    };
    return this.config;
  }

  throwError(error: any) {
    if (error?.response?.status == 401) {
      throw new BadRequestError(error?.response?.statusText || "Mismatched Credentials");
    }

    throw new BadRequestError(error?.response?.statusText || "Dashboard Offline");
  }
}
