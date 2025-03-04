/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-05-17 16:29:34
 * @modify date 2022-05-17 16:29:34
 * @desc [description]
 */

import axios from "axios";
import { toCamelKeys } from "keys-transform";
import Container, { Service } from "typedi";
import { jasperEndpoint, jasperPassword, jasperUsername } from "../../../configs/app.config";
import { liveIpClient } from "../../../configs/coop.config";
import { SamityInfoServices } from "../../../modules/coop/coop/services/coop/samityInfo/samity-Info.service";
import { getFileName } from "../../../utils/file.util";
import { uploadObject } from "../../../utils/minio.util";
import { getSamityDataByUser } from "../../../utils/pdf/report.utils";

@Service()
export class SamityDocumentsService {
  #primarySamityByLaw: string = "2.2_ByLaw_PrimarySamity.pdf";
  #samityRegistrationCertificate: string = "2.10_PrimarySamityRegistrationCertificate.pdf";
  #samityAmenedmentCertificate: string = "2.22_by_lawsAmendementCertificate.pdf";
  #informationSlip: string = "2.13_InformationSlip.pdf";
  #committeeOrderFinalApproval: string = "2.14_CommitteeOrder_FinalApproval.pdf";
  #committeeOrderFinalApprovalCentral: string = "2.14_CommitteeOrder_FinalApproval_Central.pdf";

  #qCodeUrl: string = liveIpClient + "/coop/certificate-check?samityId=";

  constructor() {}

  async getCertificate(samityId: number, tempSamityId: number, documentName: string, pUrlLink?: string) {
    if (!samityId && !documentName) return { fileName: null };

    try {
      const { data } = await axios.get(`${jasperEndpoint}coop/${documentName}`, {
        responseType: "stream",
        params: {
          j_username: jasperUsername,
          j_password: jasperPassword,
          pSamityId: samityId,
          pUrlLink,
        },
      });
      if (!data) return { fileName: null };

      const fileName = getFileName(documentName);

      await uploadObject({ fileName, buffer: data });

      return {
        fileName,
      };
    } catch (error) {
      //
    }

    return { fileName: null };
  }

  async generateByLawAmendment(samityId: number, DesignationDetails: any) {
    if (!samityId) return { fileName: null };
    try {
      const SamityInfoService = Container.get(SamityInfoServices);
      const samityInfo = await SamityInfoService.getSamityReport(Number(samityId));
      const byLawsData: any = await getSamityDataByUser(toCamelKeys(samityInfo), DesignationDetails);
      if (!byLawsData) return { fileName: null };
      const fileName = getFileName("by-law.pdf");
      await uploadObject({ fileName, buffer: byLawsData });
      return {
        fileName,
      };
    } catch (error) {}

    return { fileName: null };
  }

  async getPrimarySamityByLaw(samityId: number, tempSamityId: number) {
    return await this.getCertificate(samityId, tempSamityId, this.#primarySamityByLaw);
  }

  async getSamityRegistrationCertificate(samityId: number, tempSamityId: number) {
    return await this.getCertificate(
      samityId,
      tempSamityId,
      this.#samityRegistrationCertificate,
      this.#qCodeUrl + samityId
    );
  }

  async getSamityAmendmentCertificate(samityId: number, tempSamityId: number, amenedmentGenCode: any) {
    return await this.getCertificate(
      samityId,
      tempSamityId,
      this.#samityAmenedmentCertificate,
      this.#qCodeUrl + samityId + "&amendmentCode=" + amenedmentGenCode
    );
  }

  async getSamityByLawAmendment(samityId: number, DesignationDetails: any) {
    return await this.generateByLawAmendment(samityId, DesignationDetails);
  }

  async getInformationSlip(samityId: number, tempSamityId: number) {
    return await this.getCertificate(samityId, tempSamityId, this.#informationSlip);
  }

  async getCommitteeOrderFinalApproval(samityId: number, tempSamityId: number, samityLevel: string) {
    return await this.getCertificate(
      samityId,
      tempSamityId,
      samityLevel == "P" ? this.#committeeOrderFinalApproval : this.#committeeOrderFinalApprovalCentral
    );
  }
}
