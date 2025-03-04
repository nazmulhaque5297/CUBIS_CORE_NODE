import { NextFunction, Request, Response } from "express";
import { AuthError, BadRequestError } from "rdcd-common";
import Container from "typedi";
import { IFeatureAttrs } from "../../../../modules/role/interfaces/feature.interface";
import { verifyLongLivedToken } from "../../../../utils/jwt.util";
import { CitizenRoleServices } from "../services/citizen-role.service";
import CitizenServices from "../services/citizen.service";

const CitizenService = Container.get(CitizenServices);
const CitizenRoleService = Container.get(CitizenRoleServices);

export function citizenAuth(featureNumberArr: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token: string | undefined = req.header("Authorization")?.replace("Bearer ", "");
    if (token) {
      try {
        const payload: any = await verifyLongLivedToken(token, "citizen");

        const features = await getFeatureCodes(payload.userId);
        // console.log({payloadFound: features})
        let isFeatureExists: Boolean = false;
        for (let i = 0; i < featureNumberArr.length; i++) {
          const featureNumber = featureNumberArr[i];
          if (features.includes(featureNumber) || featureNumber === "*") {
            isFeatureExists = true;
            break;
          }
        }
        if (isFeatureExists) {
          req.user = payload;
          next();
        } else next(new AuthError("ইউসার এর এই  মেনু ব্যবহার করার অনুমোদন দেয়া হয়নি"));
      } catch (ex) {
        next(new AuthError("সরবরাহকারী টোকেন টি সঠিক নয়"));
      }
    } else next(new AuthError("সঠিক টোকেন সরবরাহ করুন"));
  };
}

//get features of the citizen
export async function getFeatureCodes(userId: number): Promise<any> {
  const citizen = await CitizenService.getById(userId);
  if (citizen && citizen.id && citizen.type === "citizen") {
    const isAuthorizedPerson = await CitizenService.isAuthorizedPerson(
      citizen.id,
      citizen.nid,
      citizen.brn,
      citizen.memberId
    );
    const features = isAuthorizedPerson
      ? ((await CitizenRoleService.getFeatureByName("AUTHORIZED_PERSON")) as IFeatureAttrs[])
      : ((await CitizenRoleService.getFeatureByName("ORGANIZER")) as IFeatureAttrs[]);
    return features.map((feature) => feature.dispalyNo);
  } else throw new BadRequestError("Invalid Citizen");
}
