import db from "../../../db/connection.db";
import BadRequestError from "../../../errors/bad-request.error";

const projectAssignValidation = async (payload: any) => {
  const pool = db.getConnection("slave");
  var pendingAssignSql = `SELECT COUNT(*) FROM temps.application WHERE CAST(data ->> 'assign_user' as integer) = $1 AND status != 'A' AND service_id = 4`;
  var pendingAssign = (await pool.query(pendingAssignSql, [payload.data.userId])).rows[0].count;
  if (parseInt(pendingAssign) > 0) {
    throw new BadRequestError("ইতিমধ্যে সিলেক্টেড ব্যবহারকারীর একটি প্রকল্প বরাদ্দ সেবা অপেক্ষমাণ আছে");
  } else {
    var projectIdSql = `SELECT project_id FROM master.user_wise_project WHERE user_id = $1`;
    var projectIds = (await pool.query(projectIdSql, [payload.data.userId])).rows;
    // if (projectIds.length <= 0)
    //   throw new BadRequestError(`বরাদ্দকৃত প্রকল্প পাওয়া যায়নি`);

    // const allProjectId = projectIds.map((v: any) => v.project_id);
    // for (const [i, v] of payload.data.projects.entries()) {
    //   if (allProjectId.includes(v.id)) {
    //     var projectNameSql = `SELECT project_name_bangla FROM master.project_info WHERE id = $1`;
    //     var projectName = (await pool.query(projectNameSql, [v.id])).rows[0].project_name_bangla;
    //     next(new BadRequestError(`ইতিমধ্যে ${projectName} প্রকল্পটি সিলেক্টেড ব্যবহারকারীকে বরাদ্দ করা আছে`));
    //   } else continue;
    // }
  }
};
export default projectAssignValidation;
