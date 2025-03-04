import { toCamelKeys, toSnakeCase, toSnakeKeys } from "keys-transform";

export function convertCamelCase(data: object[]) {
  const allData: object[] = [];
  for (let i = 0; i < data.length; i++) {
    const d: object = toCamelKeys(data[i]);
    allData.push(d);
  }
  return allData;
}

export function convertToSnakeKeys(data: object[]) {
  const allData: object[] = [];
  for (let i = 0; i < data.length; i++) {
    const d: object = toSnakeKeys(data[i]);
    allData.push(d);
  }
  return allData;
}

export function toSnakeKeysArray(data: any[]) {
  const convertedData = [];
  for (const element of data) {
    convertedData.push(toSnakeCase(element));
  }
  return convertedData;
}
