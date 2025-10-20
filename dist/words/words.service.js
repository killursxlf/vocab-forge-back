"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WordsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let WordsService = class WordsService {
    prisma;
    UP = parseInt(process.env.LEARN_STREAK_THRESHOLD ?? '3', 10);
    DOWN_ENABLED = (process.env.DOWNGRADE_ON_MISS ?? 'true') === 'true';
    DOWN = parseInt(process.env.DOWNGRADE_MISS_THRESHOLD ?? '3', 10);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async checkWordSetOwnership(wordSetId, userId) {
        const wordSet = await this.prisma.wordSet.findUnique({
            where: { id: wordSetId },
        });
        if (!wordSet || wordSet.userId !== userId) {
            throw new common_1.ForbiddenException('Access to this resource is denied');
        }
    }
    async create(createWordDto, wordSetId, userId) {
        await this.checkWordSetOwnership(wordSetId, userId);
        return this.prisma.word.create({
            data: {
                ...createWordDto,
                wordSetId: wordSetId,
            },
        });
    }
    async update(wordId, updateWordDto, userId) {
        const word = await this.prisma.word.findUnique({ where: { id: wordId } });
        if (!word)
            throw new common_1.NotFoundException('Word not found');
        await this.checkWordSetOwnership(word.wordSetId, userId);
        return this.prisma.word.update({
            where: { id: wordId },
            data: updateWordDto,
        });
    }
    async remove(wordId, userId) {
        const word = await this.prisma.word.findUnique({ where: { id: wordId } });
        if (!word)
            throw new common_1.NotFoundException('Word not found');
        await this.checkWordSetOwnership(word.wordSetId, userId);
        return this.prisma.word.delete({ where: { id: wordId } });
    }
    async submitAnswer(wordId, knows, userId) {
        const now = new Date();
        const word = await this.prisma.word.findUnique({
            where: { id: wordId },
            include: { wordSet: { select: { userId: true } } },
        });
        if (!word)
            throw new common_1.NotFoundException('Word not found');
        if (word.wordSet.userId !== userId)
            throw new common_1.ForbiddenException();
        let { status, successStreak, missStreak, timesSeen, timesCorrect, learnedAt, } = word;
        timesSeen += 1;
        if (knows) {
            timesCorrect += 1;
            successStreak += 1;
            missStreak = 0;
            if (status === client_1.WordStatus.NEW)
                status = client_1.WordStatus.LEARNING;
            if (successStreak >= this.UP && status !== client_1.WordStatus.LEARNED) {
                status = client_1.WordStatus.LEARNED;
                learnedAt = now;
            }
        }
        else {
            successStreak = 0;
            missStreak = (missStreak ?? 0) + 1;
            if (status === client_1.WordStatus.LEARNED &&
                this.DOWN_ENABLED &&
                missStreak >= this.DOWN) {
                status = client_1.WordStatus.LEARNING;
                learnedAt = null;
                missStreak = 0;
            }
        }
        return this.prisma.word.update({
            where: { id: wordId },
            data: {
                status,
                successStreak,
                missStreak,
                timesSeen,
                timesCorrect,
                learnedAt,
                lastReviewedAt: now,
            },
        });
    }
};
exports.WordsService = WordsService;
exports.WordsService = WordsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WordsService);
//# sourceMappingURL=words.service.js.map