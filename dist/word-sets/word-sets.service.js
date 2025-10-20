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
exports.WordSetsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let WordSetsService = class WordSetsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(createWordSetDto, userId) {
        return this.prisma.wordSet.create({
            data: {
                ...createWordSetDto,
                userId: userId,
            },
        });
    }
    findAll(userId) {
        return this.prisma.wordSet.findMany({
            where: {
                userId: userId,
            },
            orderBy: {
                id: 'desc',
            },
        });
    }
    async findOne(id, userId, offset = 0, limit = 100, search, status) {
        const wordSet = await this.prisma.wordSet.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                customColumns: true,
                userId: true,
            },
        });
        if (!wordSet || wordSet.userId !== userId) {
            throw new common_1.NotFoundException('Word set not found');
        }
        const whereClause = {
            wordSetId: id,
        };
        if (status) {
            whereClause.status = status;
        }
        if (search) {
            whereClause.OR = [
                { original: { contains: search, mode: 'insensitive' } },
                { translation: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [words, totalCount] = await Promise.all([
            this.prisma.word.findMany({
                where: whereClause,
                orderBy: { createdAt: 'asc' },
                skip: offset,
                take: limit,
            }),
            this.prisma.word.count({
                where: whereClause,
            }),
        ]);
        return {
            ...wordSet,
            words,
            total: totalCount,
            hasMore: offset + limit < totalCount,
        };
    }
    async update(id, updateWordSetDto, userId) {
        await this.findOne(id, userId, 0, 0);
        return this.prisma.wordSet.update({
            where: { id },
            data: updateWordSetDto,
        });
    }
    async remove(id, userId) {
        await this.findOne(id, userId, 0, 0);
        return this.prisma.wordSet.delete({
            where: { id },
        });
    }
};
exports.WordSetsService = WordSetsService;
exports.WordSetsService = WordSetsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WordSetsService);
//# sourceMappingURL=word-sets.service.js.map