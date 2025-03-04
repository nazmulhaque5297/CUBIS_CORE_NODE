import { query } from "express-validator";
import { toSnakeCase } from "keys-transform";
import _ from "lodash";
import { searchType } from "../services/page-data.query";

export const pageValidatorDataSearch = [
  query("searchType")
    .exists()
    .withMessage("searchType is not present in query ")
    .notEmpty()
    .withMessage("SearchType can not be null")
    .custom((value) => {
      //@ts-ignore
      const searchKey = searchType[value];
      return searchKey ? true : false;
    })
    .withMessage("Invalid SearchType "),
  query()
    .exists()
    .withMessage("query is not present in query ")
    .notEmpty()
    .withMessage("query can not be null")
    .custom((value) => {
      //@ts-ignore
      const searchKey: any = searchType[value.searchType].key;
      const queryWithoutSearchType = _.omit(value, "searchType");
      const keys = Object.keys(queryWithoutSearchType);
      for (const element of keys) {
        if (!searchKey.includes(toSnakeCase(element))) {
          return false;
        }
      }
      return true;
    })
    .withMessage("query is not assignable with searchType "),
];
