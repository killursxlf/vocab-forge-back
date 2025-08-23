import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createUserDto: CreateUserDto): Promise<{
        email: string;
        name: string | null;
        googleId: string | null;
        createdAt: Date;
        updatedAt: Date;
        id: number;
    }>;
    findOneByEmail(email: string): Promise<{
        email: string;
        name: string | null;
        password: string | null;
        googleId: string | null;
        createdAt: Date;
        updatedAt: Date;
        id: number;
    } | null>;
    findOneById(id: number): Promise<{
        email: string;
        name: string | null;
        googleId: string | null;
        createdAt: Date;
        updatedAt: Date;
        id: number;
    }>;
    update(id: number, updateUserDto: UpdateUserDto): Promise<{
        email: string;
        name: string | null;
        googleId: string | null;
        createdAt: Date;
        updatedAt: Date;
        id: number;
    }>;
    changePassword(id: number, currentPass: string, newPass: string): Promise<{
        message: string;
    }>;
    findAll(): import("@prisma/client").Prisma.PrismaPromise<{
        email: string;
        name: string | null;
        createdAt: Date;
        id: number;
    }[]>;
    remove(id: number): Promise<{
        message: string;
    }>;
}
