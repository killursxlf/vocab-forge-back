"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateWordSetDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_word_set_dto_1 = require("./create-word-set.dto");
class UpdateWordSetDto extends (0, mapped_types_1.PartialType)(create_word_set_dto_1.CreateWordSetDto) {
}
exports.UpdateWordSetDto = UpdateWordSetDto;
//# sourceMappingURL=update-word-set.dto.js.map