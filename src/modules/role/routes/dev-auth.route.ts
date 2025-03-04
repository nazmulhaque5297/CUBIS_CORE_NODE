import express, { Router, Request, Response, NextFunction } from 'express';
import { getLongLivedToken } from '../../../utils/jwt.util';
import { validates } from '../../../middlewares/express-validation.middle';
import { wrap } from '../../../middlewares/wraps.middle';
import { devCredentialCheck } from '../middlewares/dev-auth.middle';
import { devLogin } from '../validators/dev-auth.validator';


const router: Router = express.Router();

/**
 * Developer Login 
 */
router.post('/login',
    [validates(devLogin), devCredentialCheck],
    wrap(async (req: Request, res: Response, next: NextFunction) => {
        const token = await getLongLivedToken({
            username: req.body.username
        }, '12h', "dev");
        
        return res.status(200).json({
            message: "Request Successful",
            data: {
                accessToken: token
            }
        })

    })
)



export default router;