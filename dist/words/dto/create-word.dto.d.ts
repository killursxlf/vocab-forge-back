import { WordStatus } from '@prisma/client';
export declare class CreateWordDto {
    original: string;
    translation: string;
    status?: WordStatus;
    customFields?: Record<string, any>;
}
