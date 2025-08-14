import { Prisma, PrismaClient } from '@prisma/client';
import csv from 'csv-parser';
import fs from 'fs';

const prisma = new PrismaClient();

async function importCSV(userId: number, filePath: string) {
  // 1. Создаём WordSet с кастомной колонкой "example"
  const wordSet = await prisma.wordSet.create({
    data: {
      title: 'Goethe B2 Wortliste',
      customColumns: [
        {
          id: 'context',
          key: 'context',
          name: 'Context'
        }
      ] as Prisma.InputJsonValue, // <-- ключевой момент
      userId: userId,
    },
  });

  const words: Prisma.WordCreateManyInput[] = [];

  // 2. Читаем CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        words.push({
          original: row.word,
          translation: row.translation,
          customFields: { context: row.example || '' } as Prisma.InputJsonValue, // <-- ключевой момент
          wordSetId: wordSet.id
        });
      })
      .on('end', resolve)
      .on('error', reject);
  });

  // 3. Импорт в БД
  if (words.length > 0) {
    await prisma.word.createMany({ data: words });
    console.log(`Импортировано ${words.length} слов в набор "${wordSet.title}"`);
  } else {
    console.log('CSV пуст или не удалось прочитать данные.');
  }
}

importCSV(3, './words_filled.csv')
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
  });
