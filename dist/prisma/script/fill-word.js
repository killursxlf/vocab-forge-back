"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const csv_parser_1 = __importDefault(require("csv-parser"));
const fs_1 = __importDefault(require("fs"));
const prisma = new client_1.PrismaClient();
async function importCSV(userId, filePath) {
    const wordSet = await prisma.wordSet.create({
        data: {
            title: 'Goethe B2 Wortliste',
            customColumns: [
                {
                    id: 'context',
                    key: 'context',
                    name: 'Context'
                }
            ],
            userId: userId,
        },
    });
    const words = [];
    await new Promise((resolve, reject) => {
        fs_1.default.createReadStream(filePath)
            .pipe((0, csv_parser_1.default)())
            .on('data', (row) => {
            words.push({
                original: row.word,
                translation: row.translation,
                customFields: { context: row.example || '' },
                wordSetId: wordSet.id
            });
        })
            .on('end', resolve)
            .on('error', reject);
    });
    if (words.length > 0) {
        await prisma.word.createMany({ data: words });
        console.log(`Импортировано ${words.length} слов в набор "${wordSet.title}"`);
    }
    else {
        console.log('CSV пуст или не удалось прочитать данные.');
    }
}
importCSV(3, './words_filled.csv')
    .then(() => prisma.$disconnect())
    .catch((err) => {
    console.error(err);
    prisma.$disconnect();
});
//# sourceMappingURL=fill-word.js.map