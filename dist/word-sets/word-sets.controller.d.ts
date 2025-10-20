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
        createdAt: Date;
        original: string;
        translation: string;
        status: import("@prisma/client").$Enums.WordStatus;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
        successStreak: number;
        timesSeen: number;
        timesCorrect: number;
        lastReviewedAt: Date | null;
        learnedAt: Date | null;
        missStreak: number;
        wordSetId: number;
    }>;
    create(createWordSetDto: CreateWordSetDto, req: RequestWithUser): import("@prisma/client").Prisma.Prisma__WordSetClient<{
        id: number;
        userId: number;
        title: string;
        customColumns: import("@prisma/client/runtime/library").JsonValue;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    findAll(req: RequestWithUser): import("@prisma/client").Prisma.PrismaPromise<{
        id: number;
        userId: number;
        title: string;
        customColumns: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    getWordSet(id: string, offset: string | undefined, limit: string | undefined, req: any, search?: string, status?: string): Promise<{
        words: {
            id: number;
            createdAt: Date;
            original: string;
            translation: string;
            status: import("@prisma/client").$Enums.WordStatus;
            customFields: import("@prisma/client/runtime/library").JsonValue | null;
            successStreak: number;
            timesSeen: number;
            timesCorrect: number;
            lastReviewedAt: Date | null;
            learnedAt: Date | null;
            missStreak: number;
            wordSetId: number;
        }[];
        total: number;
        hasMore: boolean;
        id: number;
        userId: number;
        title: string;
        customColumns: import("@prisma/client/runtime/library").JsonValue;
    }>;
    update(id: number, updateWordSetDto: UpdateWordSetDto, req: RequestWithUser): Promise<{
        id: number;
        userId: number;
        title: string;
        customColumns: import("@prisma/client/runtime/library").JsonValue;
    }>;
    remove(id: number, req: RequestWithUser): Promise<{
        id: number;
        userId: number;
        title: string;
        customColumns: import("@prisma/client/runtime/library").JsonValue;
    }>;
}
