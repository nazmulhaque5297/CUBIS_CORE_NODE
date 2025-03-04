import { NextFunction, Request, Response, Router } from "express";
import { buildInsertSql } from "rdcd-common";
import Container from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { wrap } from "../../../../middlewares/wraps.middle";
import SamityInfoScheduleServices from "../services/schedule.service";

const SamityInfoScheduleService = Container.get(SamityInfoScheduleServices);
const router = Router();

router.post(
  "/enterDataIntoArchive",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const { tableName, data, archiveInfoId } = req.body;

    try {
      for (const ele of data) {
        const { sql: archiveSql, params: archiveParam } = buildInsertSql(tableName, ele);
        const archiveResult = (await (await pgConnect.getConnection("archive")).query(archiveSql, archiveParam)).rows;
      }

      const { sql: archiveLogSql, params: aechiveLogParams } = buildInsertSql("coop.archive_log", {
        archiveInfoId,
        log: "data archive sucessfully",
        isArchive: true,
      });

      const archiveLogData = (await (await pgConnect.getConnection("master")).query(archiveLogSql, aechiveLogParams))
        .rows;

      res.status(201).send({
        message: "data Created Successfully",
      });
    } catch (ex) {
      const { sql: archiveLogSql, params: aechiveLogParams } = buildInsertSql("coop.archive_log", {
        archiveInfoId,
        log: ex,
        isArchive: false,
      });

      const archiveLogData = (await (await pgConnect.getConnection("master")).query(archiveLogSql, aechiveLogParams))
        .rows;

      res.status(400).send({
        message: "data Can not created",
      });
    }
  })
);

router.post(
  "/:type",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    await SamityInfoScheduleService.generateSchedule();

    res.status(200).send({
      message: "Data Serve Successfully",
      data: true,
    });
  })
);

export { router as ArchiveRouter };
