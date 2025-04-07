/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-02 15:30:34
 * @modify date 2021-11-02 15:30:34
 * @desc [description]
 */
import { body, param } from "express-validator";

export const validateCommitteeRole = [
  body("roleName").exists().notEmpty().trim().toLowerCase(),
  body("noOfMember").exists(),
];

export const validateCommitteeRoleDel = [param("id").isNumeric()];

export const validateCommitteeRoleUpdate = [...validateCommitteeRole, ...validateCommitteeRoleDel];
