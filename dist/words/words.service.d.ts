import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWordDto } from './dto/create-word.dto';
import { UpdateWordDto } from './dto/update-word.dto';
export declare class WordsService {
    private prisma;
    constructor(prisma: PrismaService);
    private checkWordSetOwnership;
    create(createWordDto: CreateWordDto, wordSetId: number, userId: number): Promise<{
        id: number;
        createdAt: Date;
        original: string;
        translation: string;
        status: import("@prisma/client").$Enums.WordStatus;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
        wordSetId: number;
    }>;
    update(wordId: number, updateWordDto: UpdateWordDto, userId: number): Promise<{
        id: number;
        createdAt: Date;
        original: string;
        translation: string;
        status: import("@prisma/client").$Enums.WordStatus;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
        wordSetId: number;
    }>;
    remove(wordId: number, userId: number): Promise<{
        id: number;
        createdAt: Date;
        original: string;
        translation: string;
        status: import("@prisma/client").$Enums.WordStatus;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
        wordSetId: number;
    }>;
}
