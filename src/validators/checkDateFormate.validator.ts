import moment from "moment";

export const isDateFormateValid = (date: string) => {
  const isDateValid = moment(date, "DD/MM/YYYY", true).isValid();
  return isDateValid ? true : false;
};
