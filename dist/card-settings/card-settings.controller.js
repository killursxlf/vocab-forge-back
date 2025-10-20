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
exports.CardSettingsController = exports.UpdateCardSettingsDto = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const card_settings_service_1 = require("./card-settings.service");
class UpdateCardSettingsDto {
    frontKey;
    backKey;
    selectedStatuses;
    hintKey;
    selectedTables;
}
exports.UpdateCardSettingsDto = UpdateCardSettingsDto;
class GetTrainingCardsDto {
    frontKey;
    backKey;
    hintKey;
    status;
    tables;
}
class CountWordsDto {
    frontKey;
    backKey;
    selectedStatuses;
    hintKey;
    selectedTables;
}
let CardSettingsController = class CardSettingsController {
    cardSettingsService;
    constructor(cardSettingsService) {
        this.cardSettingsService = cardSettingsService;
    }
    async getSettings(req, tables) {
        try {
            const userId = req.user.userId;
            if (!userId) {
                throw new common_1.HttpException('User not found', common_1.HttpStatus.UNAUTHORIZED);
            }
            const selectedTables = tables ? tables.split(',') : undefined;
            const result = await this.cardSettingsService.getSettings(userId, selectedTables);
            return {
                data: {
                    frontKey: result.frontKey,
                    backKey: result.backKey,
                    hintKey: result.hintKey,
                    selectedStatuses: result.selectedStatuses,
                    selectedTables: result.selectedTables,
                    userColumns: result.userColumns || []
                }
            };
        }
        catch (error) {
            console.error('Error getting card settings:', error);
            throw new common_1.HttpException('Failed to get card settings', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async updateSettings(req, updateData) {
        try {
            const userId = req.user.userId;
            if (!userId) {
                throw new common_1.HttpException('User not found', common_1.HttpStatus.UNAUTHORIZED);
            }
            const result = await this.cardSettingsService.updateSettings(userId, updateData);
            const settingsWithColumns = await this.cardSettingsService.getSettings(userId, updateData.selectedTables);
            return {
                data: {
                    frontKey: result.frontKey,
                    backKey: result.backKey,
                    hintKey: result.hintKey,
                    selectedStatuses: result.selectedStatuses,
                    selectedTables: result.selectedTables,
                    userColumns: settingsWithColumns.userColumns || []
                }
            };
        }
        catch (error) {
            console.error('Error updating card settings:', error);
            throw new common_1.HttpException('Failed to update card settings', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async countWords(req, body) {
        const userId = req.user.userId;
        if (!userId) {
            throw new common_1.HttpException('User not found', common_1.HttpStatus.UNAUTHORIZED);
        }
        const count = await this.cardSettingsService.countWords(userId, body);
        return { data: { count } };
    }
    async getTrainingCards(req) {
        const userId = req.user.userId;
        if (!userId) {
            throw new common_1.HttpException('User not found', common_1.HttpStatus.UNAUTHORIZED);
        }
        return this.cardSettingsService.getTrainingCards(userId);
    }
};
exports.CardSettingsController = CardSettingsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('tables')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CardSettingsController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Put)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UpdateCardSettingsDto]),
    __metadata("design:returntype", Promise)
], CardSettingsController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Post)('count'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CountWordsDto]),
    __metadata("design:returntype", Promise)
], CardSettingsController.prototype, "countWords", null);
__decorate([
    (0, common_1.Get)('cards'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CardSettingsController.prototype, "getTrainingCards", null);
exports.CardSettingsController = CardSettingsController = __decorate([
    (0, common_1.Controller)('card-settings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [card_settings_service_1.CardSettingsService])
], CardSettingsController);
//# sourceMappingURL=card-settings.controller.js.map