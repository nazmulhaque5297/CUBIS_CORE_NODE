/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-12-05 11:37:18
 * @modify date 2021-12-05 11:37:18
 * @desc [description]
 */

import fs from "fs";
import yaml from "js-yaml";
import path from "path";

const configPath = path.resolve(__dirname + "/../../resources/citizen-role/citizen-role.yaml");
export const citizenConf: any = yaml.load(fs.readFileSync(configPath, "utf-8"));
