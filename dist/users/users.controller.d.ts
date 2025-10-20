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
        id: number;
        googleId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getProfile(req: RequestWithUser): Promise<{
        email: string;
        name: string | null;
        id: number;
        googleId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfile(req: RequestWithUser, updateUserDto: UpdateUserDto): Promise<{
        email: string;
        name: string | null;
        id: number;
        googleId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    changePassword(req: RequestWithUser, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    findAll(): import("@prisma/client").Prisma.PrismaPromise<{
        email: string;
        name: string | null;
        id: number;
        createdAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        email: string;
        name: string | null;
        id: number;
        googleId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<{
        email: string;
        name: string | null;
        id: number;
        googleId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
export {};
