import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import type { User } from './interfaces/user.interface';
interface LoginResponse {
    access_token: string;
}
export declare class AuthService {
    private usersService;
    private jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    validateUser(email: string, pass: string): Promise<Omit<User, 'password'> | null>;
    login(user: Omit<User, 'password'>): LoginResponse;
    validateGoogleUser(googleProfile: {
        googleId: string;
        email: string;
        name: string;
    }): Promise<{
        email: string;
        name: string | null;
        googleId: string | null;
        createdAt: Date;
        updatedAt: Date;
        userId: number;
    }>;
}
export {};
