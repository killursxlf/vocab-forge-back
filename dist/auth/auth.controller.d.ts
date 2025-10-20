import type { Response } from 'express';
import { LoginDto } from '../auth/dto/login.dto';
import { AuthService } from './auth.service';
import type { RequestWithUser } from './interfaces/request-with-user.interface';
import type { User } from './interfaces/user.interface';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto, response: Response): Promise<Omit<User, 'password'>>;
    getProfile(req: RequestWithUser): User;
    logout(response: Response): {
        message: string;
    };
    googleLogin(): void;
    googleCallback(req: RequestWithUser, response: Response): Response<any, Record<string, any>>;
}
