import { Application } from "express";
import featureRouter from './routes/feature.route';
import roleRouter from './routes/role.route';


export function init(app: Application) {
    app.use('/coop/role/feature', featureRouter);
    app.use('/coop/role', roleRouter);
}