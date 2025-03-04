/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-02-08 11:01:31
 * @modify date 2022-02-08 11:01:31
 * @desc [description]
 */

export interface ServiceInfoAttrs {
    id?: number;
    service_name: string;
    project_app_rules?: JSON;
    primary_app_rules?: JSON;
    kendrio_app_rules?: JSON;
    jatio_app_rules?: JSON;
    createdBy?: string;
    createdAt?: Date;
    updatedBy?: string | null;
    updatedAt?: Date | null;
}
