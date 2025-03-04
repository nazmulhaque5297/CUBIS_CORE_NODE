import { Meta } from "express-validator";
import { isCustomDate } from "../is-custom-date.validator";

const meta: Meta = { req: {}, location: "body", path: "foo" };

const dateArray: string[] = [
  "2020-01-01",
  "2020-01-01T00:00:00",
  "2020-01-01T00:00:00.000",
  "2020-01-01T00:00:00.000Z",
  "2020-01-01T00:00:00.000+00:00",
  new Date().toISOString(),
  new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  new Date().toISOString().replace(/\.\d{3}$/, ""),
  new Date().toLocaleString(),
  new Date().toLocaleString().replace(/\.\d{3}Z$/, "Z"),
  new Date().toLocaleString().replace(/\.\d{3}$/, ""),
  "2020/01/01",
  "01-01-2020",
  "01/01/2020",
  "01/01/2020 00:00:00",
  "01/01/2020 00:00:00.000",
  "01/01/2020 00:00:00.000Z",
  "01/01/2020 00:00:00.000+00:00",
  "08/15/2020",
];

const dateArrayInvalid: string[] = ["hello", "2020/41/01"];

describe("it tests if the date validator is correct", () => {
  it("should return true if the date is valid", () => {
    dateArray.forEach((date) => {
      expect(isCustomDate(date, meta)).toBe(true);
    });
  });
  it("should return false if the date is not valid", () => {
    dateArrayInvalid.forEach((date) => {
      expect(isCustomDate(date, meta)).toBe(false);
    });
  });
});
