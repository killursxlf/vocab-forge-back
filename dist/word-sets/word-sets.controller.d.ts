import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { CreateWordSetDto } from './dto/create-word-set.dto';
import { UpdateWordSetDto } from './dto/update-word-set.dto';
import { WordSetsService } from './word-sets.service';
import { WordsService } from 'src/words/words.service';
import { CreateWordDto } from 'src/words/dto/create-word.dto';
export declare class WordSetsController {
    private readonly wordSetsService;
    private readonly wordsService;
    constructor(wordSetsService: WordSetsService, wordsService: WordsService);
    addWord(id: number, createWordDto: CreateWordDto, req: RequestWithUser): Promise<{
        id: number;
        original: string;
        translation: string;
        status: import("@prisma/client").$Enums.WordStatus;
        createdAt: Date;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
        wordSetId: number;
    }>;
    create(createWordSetDto: CreateWordSetDto, req: RequestWithUser): import("@prisma/client").Prisma.Prisma__WordSetClient<{
        id: number;
        title: string;
        customColumns: import("@prisma/client/runtime/library").JsonValue;
        userId: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    findAll(req: RequestWithUser): import("@prisma/client").Prisma.PrismaPromise<{
        id: number;
        title: string;
        customColumns: import("@prisma/client/runtime/library").JsonValue;
        userId: number;
    }[]>;
    getWordSet(id: string, offset: string | undefined, limit: string | undefined, req: any, search?: string, status?: string): Promise<{
        words: {
            id: number;
            original: string;
            translation: string;
            status: import("@prisma/client").$Enums.WordStatus;
            createdAt: Date;
            customFields: import("@prisma/client/runtime/library").JsonValue | null;
            wordSetId: number;
        }[];
        total: number;
        hasMore: boolean;
        id: number;
        title: string;
        customColumns: import("@prisma/client/runtime/library").JsonValue;
        userId: number;
    }>;
    update(id: number, updateWordSetDto: UpdateWordSetDto, req: RequestWithUser): Promise<{
        id: number;
        title: string;
        customColumns: import("@prisma/client/runtime/library").JsonValue;
        userId: number;
    }>;
    remove(id: number, req: RequestWithUser): Promise<{
        id: number;
        title: string;
        customColumns: import("@prisma/client/runtime/library").JsonValue;
        userId: number;
    }>;
}
