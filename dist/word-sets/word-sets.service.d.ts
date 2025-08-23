import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWordSetDto } from './dto/create-word-set.dto';
import { UpdateWordSetDto } from './dto/update-word-set.dto';
import { Prisma } from '@prisma/client';
export declare class WordSetsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createWordSetDto: CreateWordSetDto, userId: number): Prisma.Prisma__WordSetClient<{
        id: number;
        title: string;
        customColumns: Prisma.JsonValue;
        userId: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    findAll(userId: number): Prisma.PrismaPromise<{
        id: number;
        title: string;
        customColumns: Prisma.JsonValue;
        userId: number;
    }[]>;
    findOne(id: number, userId: number, offset?: number, limit?: number, search?: string, status?: string): Promise<{
        words: {
            id: number;
            createdAt: Date;
            original: string;
            translation: string;
            status: import("@prisma/client").$Enums.WordStatus;
            customFields: Prisma.JsonValue | null;
            wordSetId: number;
        }[];
        total: number;
        hasMore: boolean;
        id: number;
        title: string;
        customColumns: Prisma.JsonValue;
        userId: number;
    }>;
    update(id: number, updateWordSetDto: UpdateWordSetDto, userId: number): Promise<{
        id: number;
        title: string;
        customColumns: Prisma.JsonValue;
        userId: number;
    }>;
    remove(id: number, userId: number): Promise<{
        id: number;
        title: string;
        customColumns: Prisma.JsonValue;
        userId: number;
    }>;
}
