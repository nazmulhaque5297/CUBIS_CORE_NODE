import CustomError from "./custom.error";

export default class AuthError extends CustomError {
    statusCode = 401;

    constructor(message?: string) {
        super(message ? message : "Unauthorized");
        Object.setPrototypeOf(this, AuthError.prototype);
    }

    serializeErrors() {
        return [{ message: this.message }];
    }
}