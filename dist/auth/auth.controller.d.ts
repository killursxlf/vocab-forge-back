import type { Response } from 'express';
import { LoginDto } from '../auth/dto/login.dto';
import { AuthService } from './auth.service';
import type { RequestWithUser } from './interfaces/request-with-user.interface';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto, response: Response): Promise<any>;
    getProfile(req: RequestWithUser): {
        userId: number;
        email: string;
    };
}
