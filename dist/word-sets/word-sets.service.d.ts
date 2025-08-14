import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWordSetDto } from './dto/create-word-set.dto';
import { UpdateWordSetDto } from './dto/update-word-set.dto';
export declare class WordSetsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createWordSetDto: CreateWordSetDto, userId: number): import("@prisma/client").Prisma.Prisma__WordSetClient<{
        id: number;
        title: string;
        customColumns: import("@prisma/client/runtime/library").JsonValue;
        userId: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    findAll(userId: number): import("@prisma/client").Prisma.PrismaPromise<{
        id: number;
        title: string;
        customColumns: import("@prisma/client/runtime/library").JsonValue;
        userId: number;
    }[]>;
    findOne(id: number, userId: number): Promise<{
        words: {
            id: number;
            original: string;
            translation: string;
            status: import("@prisma/client").$Enums.WordStatus;
            customFields: import("@prisma/client/runtime/library").JsonValue | null;
            createdAt: Date;
            wordSetId: number;
        }[];
    } & {
        id: number;
        title: string;
        customColumns: import("@prisma/client/runtime/library").JsonValue;
        userId: number;
    }>;
    update(id: number, updateWordSetDto: UpdateWordSetDto, userId: number): Promise<{
        id: number;
        title: string;
        customColumns: import("@prisma/client/runtime/library").JsonValue;
        userId: number;
    }>;
    remove(id: number, userId: number): Promise<{
        id: number;
        title: string;
        customColumns: import("@prisma/client/runtime/library").JsonValue;
        userId: number;
    }>;
}
