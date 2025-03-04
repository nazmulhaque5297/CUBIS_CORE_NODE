/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-05-21 15:02:31
 * @modify date 2022-05-21 15:02:31
 * @desc [description]
 */

import { DOCCustomScheduleCalculator } from "../doc-custom-schedule.util";

describe("tests doc schedule", () => {
  it("get doc schedule", async () => {
    const cal = new DOCCustomScheduleCalculator({
      principal: 100000,
      rate: 4,
      loanTerm: 24,
      type: "F",
      installmentType: "M",
      gracePeriodType: "NO-CHARGE",
      gracePeriod: 12,
    });

    const loan = cal.get();
  });
});
