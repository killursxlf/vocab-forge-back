import type { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';
import { UpdateWordDto } from './dto/update-word.dto';
import { WordsService } from './words.service';
export declare class WordsController {
    private readonly wordsService;
    constructor(wordsService: WordsService);
    update(id: number, updateWordDto: UpdateWordDto, req: RequestWithUser): Promise<{
        id: number;
        original: string;
        translation: string;
        status: import("@prisma/client").$Enums.WordStatus;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        wordSetId: number;
    }>;
    remove(id: number, req: RequestWithUser): Promise<{
        id: number;
        original: string;
        translation: string;
        status: import("@prisma/client").$Enums.WordStatus;
        customFields: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        wordSetId: number;
    }>;
}
