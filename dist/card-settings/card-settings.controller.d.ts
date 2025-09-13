import { CardSettingsService } from './card-settings.service';
export declare class UpdateCardSettingsDto {
    frontKey?: string;
    backKey?: string;
    selectedStatuses?: string[];
    hintKey?: string | null;
    selectedTables?: string[];
}
declare class CountWordsDto {
    frontKey: string;
    backKey: string;
    selectedStatuses: string[];
    hintKey: string | null;
    selectedTables: string[];
}
interface AuthenticatedRequest extends Request {
    user: {
        userId: number;
        email: string;
    };
}
export declare class CardSettingsController {
    private readonly cardSettingsService;
    constructor(cardSettingsService: CardSettingsService);
    getSettings(req: AuthenticatedRequest, tables?: string): Promise<{
        data: {
            frontKey: string;
            backKey: string;
            hintKey: string | null;
            selectedStatuses: string[];
            selectedTables: string[];
            userColumns: {
                key: string;
                name: string;
            }[];
        };
    }>;
    updateSettings(req: AuthenticatedRequest, updateData: UpdateCardSettingsDto): Promise<{
        data: {
            frontKey: string;
            backKey: string;
            hintKey: string | null;
            selectedStatuses: string[];
            selectedTables: string[];
            userColumns: {
                key: string;
                name: string;
            }[];
        };
    }>;
    countWords(req: AuthenticatedRequest, body: CountWordsDto): Promise<{
        data: {
            count: number;
        };
    }>;
    getTrainingCards(req: AuthenticatedRequest): Promise<({
        customFields: null;
        id: number;
        createdAt: Date;
        original: string;
        translation: string;
        status: import("@prisma/client").$Enums.WordStatus;
        successStreak: number;
        timesSeen: number;
        timesCorrect: number;
        lastReviewedAt: Date | null;
        learnedAt: Date | null;
        missStreak: number;
        wordSetId: number;
    } | {
        customFields: {
            [x: string]: any;
        };
        id: number;
        createdAt: Date;
        original: string;
        translation: string;
        status: import("@prisma/client").$Enums.WordStatus;
        successStreak: number;
        timesSeen: number;
        timesCorrect: number;
        lastReviewedAt: Date | null;
        learnedAt: Date | null;
        missStreak: number;
        wordSetId: number;
    })[]>;
}
export {};
