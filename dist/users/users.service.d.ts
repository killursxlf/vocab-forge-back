import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { User } from '@prisma/client';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createUserDto: CreateUserDto): Promise<{
        email: string;
        name: string | null;
        id: number;
        googleId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findOneByEmail(email: string): Promise<{
        email: string;
        password: string | null;
        name: string | null;
        id: number;
        googleId: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    findOneById(id: number): Promise<{
        email: string;
        name: string | null;
        id: number;
        googleId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: number, updateUserDto: UpdateUserDto): Promise<{
        email: string;
        name: string | null;
        id: number;
        googleId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    changePassword(id: number, currentPass: string, newPass: string): Promise<{
        message: string;
    }>;
    findAll(): import("@prisma/client").Prisma.PrismaPromise<{
        email: string;
        name: string | null;
        id: number;
        createdAt: Date;
    }[]>;
    remove(id: number): Promise<{
        message: string;
    }>;
    findOneByGoogleId(googleId: string): Promise<User | null>;
    updateGoogleId(userId: number, googleId: string): Promise<User>;
    createWithGoogle(data: {
        email: string;
        name: string;
        googleId: string;
    }): Promise<User>;
}
