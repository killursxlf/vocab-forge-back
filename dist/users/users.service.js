"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createUserDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: createUserDto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('Пользователь с таким email уже существует');
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);
        const user = await this.prisma.user.create({
            data: {
                name: createUserDto.name,
                email: createUserDto.email,
                password: hashedPassword,
            },
        });
        const { password, ...result } = user;
        return result;
    }
    async findOneByEmail(email) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }
    async findOneById(id) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException(`Пользователь с ID ${id} не найден`);
        }
        const { password, ...result } = user;
        return result;
    }
    async update(id, updateUserDto) {
        if (updateUserDto.email) {
            const existingUser = await this.prisma.user.findUnique({
                where: { email: updateUserDto.email },
            });
            if (existingUser && existingUser.id !== id) {
                throw new common_1.ConflictException('Этот email уже используется');
            }
        }
        const user = await this.prisma.user.update({
            where: { id },
            data: updateUserDto,
        });
        const { password, ...result } = user;
        return result;
    }
    async changePassword(id, currentPass, newPass) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException('Пользователь не найден');
        }
        if (!user.password) {
            throw new common_1.BadRequestException('Вы зарегистрировались через социальные сети и еще не установили пароль.');
        }
        const isPasswordMatch = await bcrypt.compare(currentPass, user.password);
        if (!isPasswordMatch) {
            throw new common_1.UnauthorizedException('Неверный текущий пароль');
        }
        const saltRounds = 10;
        const hashedNewPassword = await bcrypt.hash(newPass, saltRounds);
        await this.prisma.user.update({
            where: { id },
            data: { password: hashedNewPassword },
        });
        return { message: 'Пароль успешно изменен' };
    }
    findAll() {
        return this.prisma.user.findMany({
            select: { id: true, email: true, name: true, createdAt: true },
        });
    }
    async remove(id) {
        await this.findOneById(id);
        await this.prisma.user.delete({ where: { id } });
        return { message: `Пользователь с ID ${id} успешно удален` };
    }
    async findOneByGoogleId(googleId) {
        return this.prisma.user.findUnique({
            where: { googleId },
        });
    }
    async updateGoogleId(userId, googleId) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { googleId },
        });
    }
    async createWithGoogle(data) {
        return this.prisma.user.create({
            data: {
                email: data.email,
                name: data.name,
                googleId: data.googleId,
            },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map