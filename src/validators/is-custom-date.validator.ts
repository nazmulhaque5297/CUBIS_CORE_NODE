import { CustomValidator } from "express-validator";

export const isCustomDate: CustomValidator = (value: string) => {
  const date = new Date(value);
  return !isNaN(date.getTime());
};
