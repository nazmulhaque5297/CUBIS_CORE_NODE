/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-05-21 15:02:31
 * @modify date 2022-05-21 15:02:31
 * @desc [description]
 */

import { ScheduleCalculator } from "../schedule.util";

describe("tests schedule", () => {
  it("get schedule of flat rate", async () => {
    const cal = new ScheduleCalculator({
      principal: 10000,
      rate: 8,
      loanTerm: 12,
      type: "F",
      installmentType: "W",
    });

    const loan = cal.get();
  });
});
