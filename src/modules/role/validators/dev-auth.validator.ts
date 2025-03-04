import { body } from "express-validator";


export const devLogin = [
    body('username', "Username must be in range 1 to 50 characters")
        .isLength({ min: 1, max: 50 }).trim(),
    body('password', "Password must be in range 1 to 100 characters")
        .isLength({ min: 1, max: 100 }).trim()
]