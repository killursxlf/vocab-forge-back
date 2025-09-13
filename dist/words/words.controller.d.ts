import type { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';
import { UpdateWordDto } from './dto/update-word.dto';
import { WordsService } from './words.service';
import { AnswerWordDto } from './dto/answer-word.dto';
export declare class WordsController {
    private readonly wordsService;
    constructor(wordsService: WordsService);
    update(id: number, updateWordDto: UpdateWordDto, req: RequestWithUser): Promise<{
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
    answer(id: string, dto: AnswerWordDto, req: any): Promise<{
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
    remove(id: number, req: RequestWithUser): Promise<{
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
}
