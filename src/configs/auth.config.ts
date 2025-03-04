import fs from "fs";
import yaml from "js-yaml";
import path from "path";

const configPath = path.resolve(__dirname + "/../../resources/authorization/authorization.yaml");
export const authConf: any = yaml.load(fs.readFileSync(configPath, "utf-8"));

export function getCode(featureName: string): string {
  return "*";
}
