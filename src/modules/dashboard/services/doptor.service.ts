/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-04-20 10:34:22
 * @modify date 2022-04-20 10:34:22
 * @desc [description]
 */

import axios from "axios";
import { buildUpsertSql } from "rdcd-common";
import { Service } from "typedi";
import { dashboardUrl } from "../../../configs/app.config";
import pgConnect from "../../../db/connection.db";
import { ComponentType } from "../../../interfaces/component.interface";
import { Dashboard } from "./dashboard.service";

@Service()
export class DoptorSyncService extends Dashboard {
  constructor(component: ComponentType) {
    super(component);
  }
  async test() {
    let allRes = [];
    for (let i = 0; i < 10; i++) {
      let res = await axios.get("localhost:8090/doptor-sync/test/time/make-api-calls");
      allRes.push(res);
    }
    return allRes;
  }
  async getDoptor() {
    try {
      const res = await axios.get(`${dashboardUrl}/api/v1/organogram/doptors`, await this.getConfig());

      if (res.status === 200) {
        return res.data as Array<any>;
      }
    } catch (error) {
      console.log({ doptorError: error });
    }
  }

  async getOfficeLayer() {
    try {
      const res = await axios.get(`${dashboardUrl}/api/v1/organogram/layers`, await this.getConfig());

      if (res.status === 200) {
        return res.data as Array<any>;
      }
    } catch (error) {
      console.log({ layerError: error });
    }
  }

  async getOfficeInfo(doptorId: number) {
    try {
      const res = await axios.get(
        `${dashboardUrl}/api/v1/organogram/doptors/${doptorId}/allchildren`,
        await this.getConfig()
      );

      if (res.status === 200) {
        return res.data as Array<any>;
      }
    } catch (error) {
      console.log({ officeError: error });
    }
  }

  async getOfficeOrigin() {
    try {
      const res = await axios.get(`${dashboardUrl}/api/v1/organogram/origins`, await this.getConfig());

      if (res.status === 200) {
        return res.data as Array<any>;
      }
    } catch (error) {
      console.log({ officeOriginError: error });
    }
  }

  async getOfficeOriginDesignation(officeId: number) {
    try {
      const res = await axios.get(
        `${dashboardUrl}/api/v1/organogram/office/${officeId}/origin_designations`,
        await this.getConfig()
      );

      if (res.status === 200) {
        return res.data as Array<any>;
      }
    } catch (error) {
      console.log({ officeOriginDesignationError: error });
    }
  }

  async getOfficeUnit(officeId: number) {
    try {
      const res = await axios.get(`${dashboardUrl}/api/v1/organogram/office/${officeId}/units`, await this.getConfig());

      if (res.status === 200) {
        return res.data as Array<any>;
      }
    } catch (error) {
      console.log({ officeUnitError: error });
    }
  }

  async getOfficeDesignation(officeId: number) {
    try {
      const res = await axios.get(
        `${dashboardUrl}/api/v1/organogram/office/${officeId}/designations`,
        await this.getConfig()
      );

      if (res.status === 200) {
        return res.data as Array<any>;
      }
    } catch (error) {
      console.log({ officeDesignationError: error });
    }
  }

  async getOfficeEmployee(officeUnitId: number) {
    try {
      const res = await axios.get(
        `${dashboardUrl}/api/v1/organogram/unit/${officeUnitId}/employees`,
        await this.getConfig()
      );

      if (res.status === 200) {
        return res.data as Array<any>;
      }
    } catch (error) {
      console.log({ officeEmployeeError: error });
    }
  }

  async getAssociations(officeId: number) {
    let res = await axios.get(`${dashboardUrl}/api/v1/doptors/10/associations`, await this.getConfig());
    if (res.status === 200) {
      // let samityData = res.data.filter((value: any) => value.office_id == officeId);
      return res.data as Array<any>;
    }
    return [];
  }

  async getMembersByAssociation(associationId: number) {
    let res = await axios.get(
      `${dashboardUrl}/api/v1/associations/${associationId}/beneficiaries`,
      await this.getConfig()
    );
    if (res.status === 200) {
      return res.data as Array<any>;
    }
    return [];
  }

  ///// syncData by doptor ////////
  async syncData(doptorId?: number) {
    const syncByDoptor = await this.syncByDoptor(doptorId);
    const OfficeOrigin = await this.syncOfficeOrigin();
    const officeLayer = await this.syncOfficeLayer();

    return {
      syncByDoptor,
      OfficeOrigin,
      officeLayer,
    };
  }

  async syncByDoptor(doptorId?: number) {
    // const doptors = await this.getDoptor();

    let count: any = {};
    const doptors = doptorId
      ? [{ id: doptorId }]
      : [{ id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }, { id: 7 }, { id: 8 }, { id: 9 }, { id: 10 }];

    try {
      for await (const doptor of doptors) {
        const office = await this.syncOfficeInfo(doptor.id);
        const syncByOffice = await this.syncByOffice(doptor.id);

        count[`${doptor.id}`] = doptor.id;
        count[doptor.id] = {
          office,
          syncByOffice,
        };
      }
    } catch (error) {
      console.log(error);
    }
    // console.log({ rootCount: count });

    return count;
  }

  async syncByOffice(doptorId: number, officeId?: number) {
    let offices = await this.getOfficeInfo(doptorId);
    if (officeId) offices = offices?.filter((value) => (value.id = officeId));

    let count: any = {};

    try {
      if (offices && offices.length > 0) {
        for await (const office of offices) {
          const officeOriginDesignation = await this.syncOfficeOriginDesignation(office.id);
          const officeUnitSyncRes = await this.syncOfficeUnit(office.id);
          const officeDesignation = await this.syncOfficeDesignation(office.id);

          count[`${office.id}`] = office.id;
          count[office.id] = {
            officeOriginDesignation,
            officeUnit: officeUnitSyncRes.officeUnitCount,
            officeEmployee: officeUnitSyncRes.officeUnitEmployeeCount,
            officeDesignation,
          };
        }
      }
    } catch (error) {
      console.log(error);
    }
    return count;
  }

  async syncDoptor() {
    const doptors = await this.getDoptor();

    const connection = await pgConnect.getConnection("master");
    let count = 0;

    if (doptors && doptors?.length > 0) {
      for await (const doptor of doptors) {
        const { sql, params } = buildUpsertSql(
          "master.doptor_info",
          "id",
          {
            id: doptor.id,
            nameEn: doptor.name.en,
            nameBn: doptor.name.bn,
            digitalNothiCode: doptor.digital_nothi_code || null,
            officePhone: doptor.office_phone || null,
            officeMobile: doptor.office_mobile || null,
            officeFax: doptor.office_fax || null,
            officeEmail: doptor.office_email || null,
            officeWeb: doptor.office_web || null,
            officeMinistryId: doptor.office_ministry_id || null,
            originId: doptor.origin.id || null,
            createdBy: "dashboard",
            createdAt: new Date(),
          },
          {
            updatedBy: "dashboard",
            updatedAt: new Date(),
          },
          ["createdAt", "createdBy"]
        );

        try {
          await connection.query(sql, params);

          count = count + 1;
        } catch (error) {
          console.log(error);
        }
      }
    }
    // console.log({ doptorCount: count });

    return count;
  }

  async syncOfficeLayer() {
    const layers = await this.getOfficeLayer();

    const connection = await pgConnect.getConnection("master");
    let count = 0;
    if (layers && layers?.length > 0) {
      for await (const layer of layers) {
        const { sql, params } = buildUpsertSql(
          "master.office_layer",
          "id",
          {
            id: layer.id,
            nameEn: layer.name.en,
            nameBn: layer.name.bn,
            parentId: layer.parent_id || null,
            createdBy: "dashboard",
            createdAt: new Date(),
          },
          {
            updatedBy: "dashboard",
            updatedAt: new Date(),
          },
          ["createdAt", "createdBy"]
        );

        try {
          await connection.query(sql, params);

          count = count + 1;
        } catch (error) {
          console.log(error);
        }
      }
    }
    // console.log({ layersCount: count });

    return count;
  }

  async syncOfficeInfo(doptorId: number, officeId?: number) {
    let offices = await this.getOfficeInfo(doptorId);
    if (officeId) offices = offices?.filter((value) => value.id == officeId);

    const connection = await pgConnect.getConnection("master");
    let count = 0;

    if (offices && offices.length > 0) {
      for await (const office of offices) {
        const { sql, params } = buildUpsertSql(
          "master.office_info",
          "id",
          {
            id: office.id,
            nameEn: office.name.en,
            nameBn: office.name.bn,
            digitalNothiCode: office.digital_nothi_code || null,
            officePhone: office.office_phone || null,
            officeMobile: office.office_mobile || null,
            officeFax: office.office_fax || null,
            officeEmail: office.office_email || null,
            officeWebsite: office.office_web || null,
            officeMinistryId: office.office_ministry_id || null,
            originId: office.origin.id || null,
            doptorId,
            divisionId: office.geo.division_id || null,
            districtId: office.geo.district_id || null,
            upazilaId: office.geo.upazila_id || null,
            parentId: office.parent.id || null,
            layerId: office.layer.id || null,
            createdBy: "dashboard",
            createdAt: new Date(),
          },
          {
            updatedBy: "dashboard",
            updatedAt: new Date(),
          },
          ["createdAt", "createdBy"]
        );
        // console.log({ sql, params });

        try {
          await connection.query(sql, params);
          count = count + 1;
        } catch (error) {
          console.log(error);
        }
      }

      const officeMaterializeViewUpdateSql = `REFRESH MATERIALIZED VIEW  master.mv_level_wise_office`;
      await connection.query(officeMaterializeViewUpdateSql);
    }
    // console.log({ officeCount: count });

    return count;
  }

  async syncOfficeOrigin() {
    const origins = await this.getOfficeOrigin();

    const connection = await pgConnect.getConnection("master");
    let count = 0;

    if (origins && origins.length > 0) {
      for await (const origin of origins) {
        const { sql, params } = buildUpsertSql("master.office_origin", "id", {
          id: origin.id,
          nameEn: origin.name.en,
          nameBn: origin.name.bn,
          parentId: origin.parent.id || null,
          layerId: origin.layer.id || null,
        });

        try {
          await connection.query(sql, params);

          count = count + 1;
        } catch (error) {
          console.log(error);
        }
      }
    }
    // console.log({ officeOriginCount: count });

    return count;
  }

  async syncOfficeOriginDesignation(officeId: number) {
    const designations = await this.getOfficeOriginDesignation(officeId);

    const connection = await pgConnect.getConnection("master");
    let count = 0;

    if (designations && designations.length > 0) {
      for await (const designation of designations) {
        const { sql, params } = buildUpsertSql("master.office_origin_designation", "id", {
          id: designation.id,
          nameEn: designation.name.en,
          nameBn: designation.name.bn,
          originUnitId: designation.origin_unit_id,
          originId: designation.origin_id,
        });

        try {
          await connection.query(sql, params);

          count = count + 1;
        } catch (error) {
          console.log(error);
        }
      }
    }
    // console.log({ officeOriginDesignationCount: count });

    return count;
  }

  async syncOfficeUnit(officeId: number) {
    const units = await this.getOfficeUnit(officeId);
    const connection = await pgConnect.getConnection("master");
    let officeUnitCount = 0;
    let officeUnitEmployeeCount = 0;

    if (units && units.length > 0) {
      for await (const unit of units) {
        const { sql, params } = buildUpsertSql(
          "master.office_unit",
          "id",
          {
            id: unit.id,
            nameEn: unit.name.en,
            nameBn: unit.name.bn,
            parentId: unit.parent.id || null,
            officeId: officeId || null,
            createdBy: "dashboard",
            createdAt: new Date(),
          },
          {
            updatedBy: "dashboard",
            updatedAt: new Date(),
          },
          ["createdAt", "createdBy"]
        );

        try {
          let res = await connection.query(sql, params);
          officeUnitCount = officeUnitCount + 1;
          let officeEmployee = await this.syncOfficeEmployee(unit.id);
          officeUnitEmployeeCount = officeUnitEmployeeCount + officeEmployee;
        } catch (error) {
          console.log(error);
        }
      }
    }

    return { officeUnitCount, officeUnitEmployeeCount };
  }

  async syncOfficeDesignation(officeId: number) {
    const designations = await this.getOfficeDesignation(officeId);

    const connection = await pgConnect.getConnection("master");
    let count = 0;

    if (designations && designations.length > 0) {
      for await (const designation of designations) {
        const { sql, params } = buildUpsertSql(
          "master.office_designation",
          "id",
          {
            id: designation.id,
            nameEn: designation.name.en || "",
            nameBn: designation.name.bn,
            officeId: designation.office.id,
            unitId: designation.unit.id,
            // isOfficeHead: designation.is_office_head,
            createdBy: "dashboard",
            createdAt: new Date(),
          },
          {
            updatedBy: "dashboard",
            updatedAt: new Date(),
          },
          ["createdAt", "createdBy"]
        );

        try {
          await connection.query(sql, params);

          count = count + 1;
        } catch (error) {
          console.log(error);
        }
      }
    }
    // console.log({ officeDesignationCount: count });

    return count;
  }

  async syncOfficeEmployee(doptorId: number) {
    const employees = await this.getOfficeEmployee(doptorId);

    const connection = await pgConnect.getConnection("master");
    let count = 0;

    if (employees && employees.length > 0) {
      for await (const employee of employees) {
        const { sql, params } = buildUpsertSql(
          "master.office_employee",
          "id",
          {
            id: employee.id,
            nameEn: employee.name.en,
            nameBn: employee.name.bn,
            designationId: employee.designation.id || null,
            email: employee.email || null,
            mobile: employee.mobile || null,
            nid: employee.nid || null,
            dob: employee.dob || null,
            createdBy: "dashboard",
            createdAt: new Date(),
          },
          {
            updatedBy: "dashboard",
            updatedAt: new Date(),
          },
          ["createdAt", "createdBy"]
        );

        try {
          await connection.query(sql, params);

          count = count + 1;
        } catch (error) {
          console.log(error);
        }
      }
    }
    // console.log({ officeEmployeeCount: count });

    return count;
  }
}
