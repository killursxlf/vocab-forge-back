# Vocab Forge Backend

API приложения для изучения слов: наборы слов с пользовательскими колонками, карточки для тренировки и отслеживание прогресса.

Стек: TypeScript, NestJS 11, Prisma ORM 6, PostgreSQL в облаке Prisma. Авторизация через email/пароль и Google OAuth, с JWT в HttpOnly cookie. Пароли хешируются с bcrypt.

## Запуск для разработки

Понадобятся Node.js 22 и доступ к базе проекта в Prisma Console. Локальную базу поднимать не требуется.

### 1. Установить зависимости

```sh
npm install
```

Если используете Bun, вместо этой команды можно выполнить `bun install`.

### 2. Создать `.env` в корне проекта

```dotenv
DATABASE_URL="<строка подключения к базе проекта из Prisma Console>"
JWT_SECRET="<случайный секрет>"
PORT=3000
FRONTEND_URL="http://localhost:8080"

GOOGLE_CLIENT_ID="<Google OAuth client ID>"
GOOGLE_CLIENT_SECRET="<Google OAuth client secret>"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"
```

`DATABASE_URL` используется и приложением, и Prisma CLI. Скопируйте строку подключения к существующей базе из Prisma Console. `.env` исключён из Git; ключи и строку подключения не добавляйте в репозиторий.

Сгенерировать `JWT_SECRET`:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Сохраните результат в `.env`. Смена секрета делает ранее выданные токены недействительными.

GoogleStrategy подключена при каждом запуске, поэтому `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET` должны быть непустыми. Для разработки без входа через Google можно поставить `local-placeholder` в оба поля. Для работающего Google OAuth нужны настоящие credentials, а `GOOGLE_CALLBACK_URL` должен быть зарегистрирован как разрешённый redirect URI в настройках OAuth клиента.

### 3. Сгенерировать Prisma Client и запустить API

```sh
npx prisma generate
npm run start:dev
```

По умолчанию API доступен по адресу `http://localhost:3000`, фронтенд — `http://localhost:8080`. Приложение подключается к базе при запуске, поэтому `DATABASE_URL` должен быть действительным.

## База данных и миграции

Схема находится в `prisma/schema.prisma`, история миграций — в `prisma/migrations/`. Основные модели: `User`, `WordSet`, `Word`, `CardSettings`, `ReviewEvent`.

Если существующая база уже соответствует проекту, для локального запуска достаточно генерации клиента. Проверить состояние миграций:

```sh
npx prisma migrate status
```

Для новой базы или применения ожидающих миграций проекта:

```sh
npx prisma migrate deploy
```

Команда изменяет базу, указанную в `DATABASE_URL`. При изменении схемы создавайте миграции на отдельной базе для разработки:

```sh
npx prisma migrate dev --name describe_change
npx prisma generate
```

Для просмотра данных:

```sh
npx prisma studio
```

Подробнее: [миграции в Prisma ORM 6](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/development-and-production).

## Авторизация и фронтенд

Регистрация: `POST /users/register` с JSON `{ "email": "user@example.com", "password": "example-password", "name": "User" }`. Вход: `POST /auth/login` с email и паролем. Google OAuth начинается с `GET /auth/google`.

При входе сервер устанавливает cookie `access_token`. JWT действует один день. Защищённые маршруты читают токен из cookie; запросы с фронтенда должны отправлять cookies (`credentials: 'include'` для fetch или `withCredentials: true` для Axios).

Cookie настроена с `HttpOnly`, `Secure` и `SameSite=None`. Для развёртывания используйте HTTPS. Если авторизация по локальному HTTP не работает, проверьте, принимает ли браузер Secure cookie для localhost.

CORS настроен в `src/main.ts`. Сейчас разрешены `http://localhost:8080`, `https://vocab-forge-front.vercel.app` и `http://192.168.178.60:8080`. Если адрес фронтенда меняется, обновите этот список. `FRONTEND_URL` задаёт адрес возврата и получателя сообщений после Google OAuth, но не меняет CORS.

## Основные маршруты

| Метод | Маршрут | Назначение |
| --- | --- | --- |
| POST | `/users/register` | Регистрация |
| POST | `/auth/login` | Вход по email и паролю |
| POST | `/auth/logout` | Выход |
| GET | `/auth/profile` | Данные из JWT |
| GET | `/auth/google` | Вход через Google |
| GET | `/auth/google/callback` | Callback Google OAuth |
| GET, PATCH | `/users/me` | Просмотр и изменение профиля |
| POST | `/users/change-password` | Смена пароля |
| GET, POST | `/word-sets` | Список и создание наборов слов |
| GET, PATCH, DELETE | `/word-sets/:id` | Просмотр, изменение и удаление набора |
| POST | `/word-sets/:id/words` | Добавление слова |
| PATCH, DELETE | `/words/:id` | Изменение и удаление слова |
| POST | `/words/:id/answer` | Ответ на карточку: `{ "knows": true }` |
| GET, PUT | `/card-settings` | Получение и сохранение настроек карточек |
| POST | `/card-settings/count` | Количество слов по выбранным настройкам |
| GET | `/card-settings/cards` | Карточки по сохранённым настройкам |

`GET /word-sets/:id` поддерживает параметры `offset` (по умолчанию 0), `limit` (100), `search` и `status`. Форматы тел запросов описаны в DTO соответствующих модулей в `src/`.

## Прогресс обучения

Статусы слова: `NEW`, `LEARNING`, `LEARNED`. Правильный ответ переводит новое слово в обучение; серия правильных ответов переводит его в изученные. Серия ошибок может вернуть изученное слово в обучение. Для каждого слова сохраняются счётчики ответов и время последнего повторения.

Необязательные переменные `.env`:

| Переменная | По умолчанию | Назначение |
| --- | --- | --- |
| `LEARN_STREAK_THRESHOLD` | `3` | Правильных ответов подряд для статуса `LEARNED` |
| `DOWNGRADE_ON_MISS` | `true` | Возвращать изученные слова в обучение при ошибках |
| `DOWNGRADE_MISS_THRESHOLD` | `3` | Ошибок подряд для возврата в `LEARNING` |

## Сборка и проверки

```sh
npm run build
npm run start:prod
```

`build` создаёт папку `dist/`, из которой запускается production сервер. Она исключена из Git, поэтому при развёртывании нужно установить зависимости, сгенерировать Prisma Client и выполнить сборку. Ожидающие миграции применяются отдельно через `npx prisma migrate deploy`.

```sh
npm test
npm run test:e2e
npm run test:cov
npm run lint
npm run format
```

E2E-тесты поднимают `AppModule` и требуют настроенного окружения и доступной базы. `lint` и `format` изменяют файлы, исправляя стиль кода.
