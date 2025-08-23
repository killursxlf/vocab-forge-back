"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WordSetsModule = void 0;
const common_1 = require("@nestjs/common");
const words_module_1 = require("../words/words.module");
const word_sets_controller_1 = require("./word-sets.controller");
const word_sets_service_1 = require("./word-sets.service");
let WordSetsModule = class WordSetsModule {
};
exports.WordSetsModule = WordSetsModule;
exports.WordSetsModule = WordSetsModule = __decorate([
    (0, common_1.Module)({
        imports: [words_module_1.WordsModule],
        controllers: [word_sets_controller_1.WordSetsController],
        providers: [word_sets_service_1.WordSetsService],
    })
], WordSetsModule);
//# sourceMappingURL=word-sets.module.js.map