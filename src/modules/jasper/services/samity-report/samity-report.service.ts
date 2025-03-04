/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-05-17 16:29:34
 * @modify date 2022-05-17 16:29:34
 * @desc [description]
 */
import fs from "fs";
import axios from "axios";
import { Service } from "typedi";
import { Blob } from "buffer";
import { jasperEndpoint, jasperPassword, jasperUsername } from "../../../../configs/app.config";
import { samityReportKeys } from "../../types/samity-report.type";
import path from "path";

@Service()
export class SamityReportServices {
  #primarySamityByLaw: string = "2.2_By_Law_Primary_Samity.pdf";
  #samityRegistrationCertificate: string = "2.10_samity_registration_certificate.pdf";
  #informationSlip: string = "2.13_InformationSlip.pdf";
  #committeeOrderFinalApproval: string = "2.14_CommitteeOrder_FinalApproval.pdf";

  #qCodeUrl: string = "http://localhost:5001/certificate-check?samityId=";

  constructor() {}

  async getCertificate(samityId: number, tempSamityId: number, documentName: string, pUrlLink?: string) {
    if (!samityId && !documentName) return { fileName: null };

    try {
      const { data } = await axios.get(
        `${jasperEndpoint}${samityReportKeys["samity-member-information-report"].documentName}`,
        {
          responseType: "arraybuffer",
          params: {
            j_username: jasperUsername,
            j_password: jasperPassword,
            pSamityId: 400,
            pCustomerId: 1195,
            pDocTypeId: 1,
          },
        }
      );

      const rPath = path.join(__dirname, "1.2_SamityMemberInfo.pdf");

      fs.writeFileSync("1.2_SamityMemberInfo.pdf", data);

      //   const base = Buffer.from(data, "base64");
      const basee = Buffer.from(data).toString("base64");

      return basee;
    } catch (error) {
      console.log(error);
    }

    // return { fileName: null };
  }
}
