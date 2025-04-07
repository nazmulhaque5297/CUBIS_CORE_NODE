import { NextFunction,Request,Response,Router } from "express";
import { toCamelKeys } from "keys-transform";
import lo from "lodash";
//import { BadRequestError, validateRequest } from "rdcd-common";
import { Container } from "typedi";
import { validateCreateUser, validateLogin } from "../validators/user-management.validator";
import { wrap } from "../../../middlewares/wraps.middle";
import { UserManagementServices } from "../services/user-management.service";
import { getLongLivedToken } from "../../../utils/jwt.util";
import { userAuth } from "../middlewares/user-management.middle";
import { validateRequest } from "rdcd-common/build";

const router: Router = Router();
const userManagementService = Container.get(UserManagementServices);


router.post(
  "/login",
  validateLogin,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataArray = req.body;
    let finalResult: any = [];
    finalResult=await userManagementService.Login(dataArray)
  
    return res.status(200).json({
                message: "Request Successful",
                data: {
                    accessToken: finalResult
                }
      })    
 
  })
);


router.post("/createUser",[ userAuth()],validateCreateUser,wrap(async(req:Request,res:Response,next:NextFunction)=>{
  const insertData = await userManagementService.CreateUser(req.body,req.user)
  return res.status(200).json({
    message: "Data saved successfully",
    data: 1
})   
}))


export {router as userManagementRouter} ;


