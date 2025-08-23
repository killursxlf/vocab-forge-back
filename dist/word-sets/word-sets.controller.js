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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WordSetsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const create_word_set_dto_1 = require("./dto/create-word-set.dto");
const update_word_set_dto_1 = require("./dto/update-word-set.dto");
const word_sets_service_1 = require("./word-sets.service");
const words_service_1 = require("../words/words.service");
const create_word_dto_1 = require("../words/dto/create-word.dto");
let WordSetsController = class WordSetsController {
    wordSetsService;
    wordsService;
    constructor(wordSetsService, wordsService) {
        this.wordSetsService = wordSetsService;
        this.wordsService = wordsService;
    }
    addWord(id, createWordDto, req) {
        const userId = req.user.userId;
        return this.wordsService.create(createWordDto, id, userId);
    }
    create(createWordSetDto, req) {
        return this.wordSetsService.create(createWordSetDto, req.user.userId);
    }
    findAll(req) {
        return this.wordSetsService.findAll(req.user.userId);
    }
    async getWordSet(id, offset = '0', limit = '100', req, search, status) {
        return this.wordSetsService.findOne(Number(id), req.user.userId, Number(offset), Number(limit), search, status);
    }
    update(id, updateWordSetDto, req) {
        return this.wordSetsService.update(id, updateWordSetDto, req.user.userId);
    }
    remove(id, req) {
        return this.wordSetsService.remove(id, req.user.userId);
    }
};
exports.WordSetsController = WordSetsController;
__decorate([
    (0, common_1.Post)(':id/words'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_word_dto_1.CreateWordDto, Object]),
    __metadata("design:returntype", void 0)
], WordSetsController.prototype, "addWord", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_word_set_dto_1.CreateWordSetDto, Object]),
    __metadata("design:returntype", void 0)
], WordSetsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WordSetsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('offset')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Req)()),
    __param(4, (0, common_1.Query)('search')),
    __param(5, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, String, String]),
    __metadata("design:returntype", Promise)
], WordSetsController.prototype, "getWordSet", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_word_set_dto_1.UpdateWordSetDto, Object]),
    __metadata("design:returntype", void 0)
], WordSetsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], WordSetsController.prototype, "remove", null);
exports.WordSetsController = WordSetsController = __decorate([
    (0, common_1.Controller)('word-sets'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [word_sets_service_1.WordSetsService,
        words_service_1.WordsService])
], WordSetsController);
//# sourceMappingURL=word-sets.controller.js.map