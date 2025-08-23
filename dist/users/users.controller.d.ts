import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import type { Request } from 'express';
import { ChangePasswordDto } from './dto/change-password.dto';
interface RequestWithUser extends Request {
    user: {
        userId: number;
        email: string;
    };
}
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(createUserDto: CreateUserDto): Promise<{
        email: string;
        name: string | null;
        googleId: string | null;
        createdAt: Date;
        updatedAt: Date;
        id: number;
    }>;
    getProfile(req: RequestWithUser): Promise<{
        email: string;
        name: string | null;
        googleId: string | null;
        createdAt: Date;
        updatedAt: Date;
        id: number;
    }>;
    updateProfile(req: RequestWithUser, updateUserDto: UpdateUserDto): Promise<{
        email: string;
        name: string | null;
        googleId: string | null;
        createdAt: Date;
        updatedAt: Date;
        id: number;
    }>;
    changePassword(req: RequestWithUser, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    findAll(): import("@prisma/client").Prisma.PrismaPromise<{
        email: string;
        name: string | null;
        createdAt: Date;
        id: number;
    }[]>;
    findOne(id: string): Promise<{
        email: string;
        name: string | null;
        googleId: string | null;
        createdAt: Date;
        updatedAt: Date;
        id: number;
    }>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<{
        email: string;
        name: string | null;
        googleId: string | null;
        createdAt: Date;
        updatedAt: Date;
        id: number;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
export {};
