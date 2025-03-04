import { Application } from "express";
import featureRouter from './routes/feature.route';
import devAuthRouter from './routes/dev-auth.route';
import roleRouter from './routes/role.route';


export function init(app: Application) {
    app.use('/role/feature', featureRouter);
    app.use('/role/auth', devAuthRouter);
    app.use('/role', roleRouter);
}