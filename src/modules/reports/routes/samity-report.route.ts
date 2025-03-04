import ejs from "ejs";
import express, { NextFunction, Request, Response, Router } from "express";
import fs from "fs";
import pdf from "html-pdf";
import path from "path";
import Container from "typedi";
import { validates } from "../../../middlewares/express-validation.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { minioPresignedGet } from "../../../utils/minio.util";
import { auth } from "../../user/middlewares/auth.middle";
import { default as SamityReportService, default as SamityService } from "../services/samity-report.service";
import {
  generateMemberReport,
  getMemberReport,
  getSamityNameByOffice,
  getSamityNameByOfficeId,
  getSamityNameWithFlag,
  getSamityNameWithoutFlag,
} from "../validators/samity.validator";
const router: Router = express.Router();

/**
 * Get samity name from division district
 * Author: Rukaiya
 * Updater: Adnan
 * authId:
 */
router.get(
  "/samity",
  auth(["*"]),
  validates(getSamityNameWithFlag),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    const result = await samityService.getSamity(
      req.user.userId,
      req.user.officeId,
      req.user.doptorId,
      req.query.districtId,
      req.query.upazilaId,
      req.query.projectId,
      req.query.flag,
      req.query.value
    );
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * Get samity name from office without flag
 * Author: Rukaiya
 * Updater: Adnan
 * authId:
 */
router.get(
  "/samityName",
  auth(["*"]),
  validates(getSamityNameByOfficeId),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    const result = await samityService.getSamityName(req.query.officeId, req.user.doptorId, req.query.projectId);
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * Get samity name from division district without flag
 * Author: Rukaiya
 * Updater: Adnan
 * authId:
 */
router.get(
  "/samityNameList",
  auth(["*"]),
  validates(getSamityNameWithoutFlag),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    const result = await samityService.getSamityNameList(
      req.user.userId,
      req.user.officeId,
      req.user.doptorId,
      req.query.districtId,
      req.query.upazilaId,
      req.query.upaCityType,
      req.query.projectId,
      req.query.value
    );
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * Get samity name based on office and project
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/samitynameByOffice",
  auth(["*"]),
  validates(getSamityNameByOffice),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    const result = await samityService.getSamityNameBasedOnOffice(
      req.query.officeId,
      req.user.doptorId,
      req.query.projectId,
      req.query.value
    );
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * Get samity report
 * Author: Rukaiya
 * Updater:
 * authId:
 */
// router.get(
//   "/samityReport",
//    auth(["*"]),
//   wrap(async (req: Request, res: Response, next: NextFunction) => {
//     const samityService: SamityService = Container.get(SamityService);
//     const result = await samityService.getSamityReport(
//       req.query.districtId,
//       req.query.upazilaId,
//       req.query.id
//     );
//     return res.status(200).json({
//       message: "Request Successful",
//       data: result,
//     });
//   })
// );

/**
 * Get member report with pagination
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/memberReport",
  auth(["*"]),
  validates(getMemberReport),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityService: SamityService = Container.get(SamityService);
    const result = await samityService.getMemberReport(
      req.query.page,
      req.query.limit,
      req.query.officeId,
      req.query.id
    );
    return res.status(200).json({
      message: "Request Successful",
      data:
        result.count == -1
          ? result
          : await minioPresignedGet(result, ["docData.own.memberImage", "docData.own.memberSign"]),
    });
  })
);

/**
 * Generate member report pdf
 * Author: Adnan
 * Updater:
 * authId:
 */
router.post(
  "/memberReportPdf",
  auth(["*"]),
  validates(generateMemberReport),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const templatePath = path.resolve(__dirname + "/../../../views/member-report.ejs");
    const reportTemplate = await fs.promises.readFile(templatePath, "utf-8");
    const samityService: SamityService = Container.get(SamityService);
    const result = await samityService.getMemberReport(null, null, req.query.officeId, req.query.id);
    const dataWithUrl = await minioPresignedGet(result, ["docData.own.memberImage", "docData.own.memberSign"]);
    //console.log({ data: dataWithUrl });
    const html = ejs.render(reportTemplate, { data: dataWithUrl });

    // const browser = await puppeteer.launch({
    //   headless: true,
    //   args: ["--no-sandbox", "--disable-setuid-sandbox"],
    // });
    // const page = await browser.newPage();
    // await page.setContent(html);
    // const pdfBuffer = await page.pdf({ format: "a4" });
    // await page.close();
    // console.log("pdfBuffer", pdfBuffer);
    // res.writeHead(200, undefined, {
    //   "Content-Type": "application/pdf",
    // });
    // return res.end(pdfBuffer);
    pdf.create(html, {}).toFile(path.resolve(__dirname + "/../member-report.pdf"), (err) => {
      if (err) {
        res.send(Promise.reject());
        return res.end();
      }

      res.send(Promise.resolve());
      return res.end();
    });
  })
);

/**
 * Download member report pdf
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/getMemberReportPdf",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    // res.sendFile(path.resolve(__dirname + "/../member-report.pdf"));
    const filePath = path.join(__dirname, "/../member-report.pdf");
    const readStream = fs.createReadStream(filePath);
    res.setHeader("content-type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="member-report.pdf"');
    readStream.pipe(res);
    readStream.on("end", () => {
      readStream.unpipe(res);
      return res.status(200).send();
    });
  })
);
router.get(
  "/:type",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityReportService = Container.get(SamityReportService);
    const result = await samityReportService.getByType(req.params.type, req.query, req.user, Number(req.user.doptorId));
    res.status(200).send({
      message: "data serve successfully",
      data: result,
    });
  })
);

export default router;
