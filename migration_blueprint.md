# Migration Blueprint

## 1. Project Overview

- **Backend framework:** Django 5.2.6
- **Language:** Python 3.11
- **Web API framework:** Django REST Framework 3.16.1
- **Authentication / Auth library:** `djangorestframework_simplejwt` 5.5.1 with custom cookie-based JWT authentication plus standard token endpoints.
- **ORM:** Django ORM
- **Apps:**
  - `auth_user` — custom authentication user model and auth-related endpoints
  - `main` — game categories, questions, user progress, score handling
- **Documentation tooling:** `drf-yasg` for Swagger/OpenAPI schema generation
- **CORS:** `django-cors-headers`
- **Storage:** Django `ImageField` / `FileField` writing to `MEDIA_ROOT`
- **Database:** `sqlite3` via Django default `sqlite3` backend (file `db.sqlite3`)
- **Runtime container:** Docker using `python:3.11-slim`

### Architecture

- Root URL config exposes two feature domains:
  - `/auth_user/` for auth and user management
  - `/api/` for game data and score services
- `auth_user.CustomUser` extends `AbstractUser` and is configured as `AUTH_USER_MODEL`.
- JWT authentication is handled at the DRF layer by a custom auth class reading from cookies.
- Image and attachment uploads are persisted to filesystem storage at `MEDIA_ROOT`.

## 2. Database Schema (SQL)

### 2.1 `auth_user_customuser`

```sql
CREATE TABLE auth_user_customuser (
  id BIGSERIAL PRIMARY KEY,
  password VARCHAR(128) NOT NULL,
  last_login TIMESTAMP WITH TIME ZONE NULL,
  is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
  first_name VARCHAR(150) NOT NULL DEFAULT '',
  last_name VARCHAR(150) NOT NULL DEFAULT '',
  is_staff BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  date_joined TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  username VARCHAR(150) NOT NULL UNIQUE,
  email VARCHAR(254) NOT NULL DEFAULT '',
  age INTEGER NULL,
  img VARCHAR(100) NOT NULL DEFAULT 'Default_pfp.jpg'
);
```

- `username` is unique and validated by `UnicodeUsernameValidator`.
- `email` is optional (`blank=True`) and stored as an empty string if missing.
- `img` is stored as a file path string.
- Standard Django auth m2m tables exist for groups and permissions; they are part of built-in auth system.

### 2.2 `main_getcategory`

```sql
CREATE TABLE main_getcategory (
  id BIGSERIAL PRIMARY KEY,
  game_name VARCHAR(255) NOT NULL,
  game_image VARCHAR(100) NOT NULL
);
```

### 2.3 `main_question`

```sql
CREATE TABLE main_question (
  id BIGSERIAL PRIMARY KEY,
  question_index INTEGER NOT NULL DEFAULT 1,
  question VARCHAR(255) NOT NULL,
  answer_1 VARCHAR(255) NOT NULL,
  answer_2 VARCHAR(255) NOT NULL,
  answer_3 VARCHAR(255) NOT NULL,
  answer_4 VARCHAR(255) NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'easy',
  correct_answer CHAR(1) NOT NULL,
  explanation TEXT NULL,
  attachment VARCHAR(100) NULL,
  main_game_id BIGINT NOT NULL REFERENCES main_getcategory(id) ON DELETE CASCADE
);
```

- `status` choices: `'easy'`, `'medium'`, `'hard'`
- `correct_answer` choices: `'1'`, `'2'`, `'3'`, `'4'`
- `question_index` is assigned in Python at creation time by counting existing questions in the same category.

### 2.4 `main_levelconfig`

```sql
CREATE TABLE main_levelconfig (
  id BIGSERIAL PRIMARY KEY,
  level_percent DOUBLE PRECISION NOT NULL DEFAULT 100
);
```

### 2.5 `main_userprofile`

```sql
CREATE TABLE main_userprofile (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES auth_user_customuser(id) ON DELETE CASCADE,
  game_id BIGINT NOT NULL REFERENCES main_question(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  step INTEGER NOT NULL DEFAULT 1,
  skipped JSON NOT NULL DEFAULT '[]'
);
```

- `skipped` stores a JSON array of skipped step indexes.
- This model represents a user-game connection for a specific question and score state.

### 2.6 `main_userprogress`

```sql
CREATE TABLE main_userprogress (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES auth_user_customuser(id) ON DELETE CASCADE,
  main_game_id BIGINT NOT NULL REFERENCES main_getcategory(id) ON DELETE CASCADE,
  last_question INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, main_game_id)
);
```

- This table tracks the last served question index per user per category.

### 2.7 Relationships

- `auth_user_customuser` 1:N `main_userprofile`
- `auth_user_customuser` 1:N `main_userprogress`
- `main_getcategory` 1:N `main_question`
- `main_question` 1:N `main_userprofile`
- `main_userprogress` is unique per `(user_id, main_game_id)`
- built-in Django auth M2M relations for groups and permissions

### 2.8 ORM / NestJS mapping notes

- `CustomUser` → `User` entity
- `GetCategory` → `Category` entity
- `Question` → `Question` entity with many-to-one to `Category`
- `UserProfile` → `UserProfile` or `UserGameState` entity with relations to `User` and `Question`
- `UserProgress` → `UserProgress` entity with unique `(user, mainGame)`
- `LevelConfig` → single configuration row; for NestJS use config service or table-backed setting entity
- File fields should map to string path columns and a file upload service in NestJS

## 3. API Documentation

### 3.1 Root routing

- `/auth_user/` → auth_user app
- `/api/` → main app
- Swagger UI available at `/swagger/`
- Redoc available at `/redoc/`
- Media served from `/media/`

### 3.2 Authentication / User Endpoints

#### `GET /auth_user/nickname/`

- Auth: none
- Description: Generates a temporary nickname from the request IP last octet and the next user id.
- Request headers: any
- Query params: none
- Response:
  - `200 OK`
  - `{ "nickname": "User<last_ip_octet><next_id>" }`
- Business rule: `last_user = CustomUser.objects.last()` and `last_id` becomes `0` when no users exist.

#### `GET /auth_user/register/`

- Auth: none
- Response:
  - `200 OK`
  - `{ "info": "for user registration" }`

#### `POST /auth_user/register/`

- Auth: none
- Actual validated fields: `username` and optional `age`
- Note: Swagger docs claim `email` and `password`, but the serializer ignores both and instead generates a password internally.
- Request body:
  - `username` (string, required)
  - `age` (integer, optional)
- Behavior:
  - generates password from `generate_password(username)`
  - creates `CustomUser(username, age)`
  - sets generated password on the user
  - authenticates user and issues JWT cookies
- Response:
  - `200 OK` on success with `{ "message": "Login successful" }`
  - `401 UNAUTHORIZED` if authentication fails after save
  - `406 NOT ACCEPTABLE` if username already exists
- Side effect: sets cookies:
  - `access_token` (JWT)
  - `refresh_token` (JWT)
- Cookie flags: `HttpOnly`, `Secure`, `SameSite=Strict`

#### `PATCH /auth_user/userimg/`

- Auth: required
- Authentication: `CookieJWTAuthentication` reads `access_token` cookie
- Request content type: multipart/form-data
- Request payload: `img` file
- Response:
  - `202 ACCEPTED` on success with `{ "info": "Image updated successfully" }`
  - `400 BAD REQUEST` for invalid file or serializer errors

#### `GET|POST /auth_user/auth/google/`

- Auth: none
- Request body (JSON):
  - `id_token` (string, required)
- Behavior:
  - verifies token using Google OAuth2 `id_token.verify_oauth2_token`
  - extracts `email`, `name`, and `picture`
  - creates or fetches user by `username`
  - if `picture` exists and the user has no `img`, stores the picture URL in `img`
  - issues `access_token` and `refresh_token` cookies
- Response:
  - `200 OK` on success with `{ "message": "Google login successful", "username": ..., "email": ... }`
  - `400 BAD REQUEST` if token is missing or invalid

#### `POST /auth_user/jwt/token/`

- Auth: none
- Standard simplejwt token obtain endpoint
- Request body:
  - `username` (string)
  - `password` (string)
- Response: standard JWT payload containing access/refresh tokens

#### `POST /auth_user/jwt/token/refresh/`

- Auth: none
- Standard simplejwt token refresh endpoint
- Request body:
  - `refresh` (string)
- Response: new access token and possibly refresh token depending on standard DRF simplejwt behavior

### 3.3 Main API Endpoints

#### `GET /api/resetscore/`

- Auth: required
- Behavior: resets every `UserProfile` row for the authenticated user:
  - `score = 0`
  - `step = 1`
- Response:
  - `200 OK`
  - `{ "message": "Game fully reset. User can start again from the beginning." }`

#### `GET /api/getcategory/`

- Auth: required
- Response body:
  - `{ "info": [ { "id": int, "game_name": string, "game_image": string }, ... ] }`
- Serializer fields: all fields from `GetCategory`

#### `GET /api/questions/<str:category>/`

- Auth: required
- Path params:
  - `category` = `game_name` of `GetCategory`
- Behavior:
  - finds category by name
  - performs `Question.objects.get(main_game=category_object)`
  - serializes one question only
- Response body:
  - `{ "question": { "id": int, "question": string, "answers": [ { "text": string, "isCorrect": bool }, ... ], "status": string, "explanation": string|null, "attachment": string|null } }`
- Note: this endpoint uses `get()` and therefore expects one question per category or else it will throw an exception.

#### `GET /api/userprofile/`

- Auth: allow any
- Response body:
  - `{ "info": [ { "id": int, "user": int, "game": int, "score": int, "step": int, "skipped": array }, ... ] }`
- Serializer: `UserProfileSerializers` with `fields='__all__'`

#### `GET /api/answer/<int:question_id>/<int:answer_id>/`

- Auth: required
- Path params:
  - `question_id` (integer)
  - `answer_id` (integer)
- Behavior:
  - loads `Question` by id
  - compares `answer_id` to `correct_answer`
  - if correct:
    - finds or creates `UserProfile` for `user` and `game=question`
    - increments `score` by `1`/`2`/`3` depending on `status`
    - saves `UserProfile`
    - returns `202 ACCEPTED`
  - if incorrect: returns `200 OK` with the correct answer
- Response examples:
  - correct: `{ "info": "Պատասխանը ճիշտ է", "status": "easy" }`
  - incorrect: `{ "info": "Պատասխանը սխալ է", "true": "2", "status": "hard" }`

#### `GET /api/top-scores/`

- Auth: allow any
- Behavior: aggregates `UserProfile.score` per username and orders by descending score
- Response: array of objects with `user__username` and `total_score`
- Example:
  - `[ { "user__username": "alice", "total_score": 120 }, ... ]`

### 3.4 Defined but not exposed routes

The following views exist in code but are not wired into `main/urls.py`:

- `GetQuestionByIndexAPI(request, category, index)`
- `GetNextQuestionAPI(request, category)`
- `SkipQuestionAPI(request)`
- `FinishGameAPI(request)`
- `DeleteUserAPI(request)`
- `Top50UserCategoryScoresAPI(request, username)`

These functions are currently unreachable in the running application and must be either exposed via NestJS routes or removed if unused.

### 3.5 Swagger / Schema notes

- Swagger schemas are declared via `swagger_auto_schema` decorators, but some are mismatched with actual serializer behavior.
- The auth registration docs claim `email` and `password` are required, but the implemented serializer does not consume them.
- `Top50UserCategoryScoresAPI` has a query against `category__name` while the model field is `game`; this is a code bug and will fail if exposed.

## 4. Business Logic Map

### 4.1 User / auth logic

- `generate_password(username: str) -> str`
  - reverses the username
  - title-cases the reversed string
  - appends `.` plus a random 3-digit number
  - example: `username='alice'` → `Ecila.527`

- `get_client_ip_last_part(request)`
  - uses `HTTP_X_FORWARDED_FOR` when present, otherwise `REMOTE_ADDR`
  - returns the last segment of IPv4 address

- `RegisterApi` logic
  - `GET` returns informational payload
  - `POST` uses serializer to create user and generate random password
  - authenticates the new user
  - if authentication succeeds, issues JWT cookies
  - if username exists, returns 406 with custom error text

- `GoogleLoginView`
  - validates Google `id_token` via Google auth library
  - maps OAuth payload to local `CustomUser`
  - reuses `username = name or email prefix`
  - stores Google profile picture URL into `img` if not already set
  - issues the same cookie-based JWT tokens as `RegisterApi`

- `CookieJWTAuthentication.authenticate(request)`
  - extracts `access_token` from request cookies
  - if missing, returns `None`
  - validates token with SimpleJWT
  - returns `(user, validated_token)`

### 4.2 Game / question flow

- `Question.save()` custom logic
  - on create (`if not self.id`)
  - counts existing questions for the same `main_game`
  - sets `question_index = last_count + 1`
  - this enforces sequential question numbering within each category

- `calculate_user_level(user)`
  - sums `score` across `UserProfile` rows for the user
  - retrieves last `LevelConfig` row
  - applies `adjusted_score = total_score * (percent / 100)`
  - computes `level = int(adjusted_score // 50)`
  - returns tuple `(level, total_score)`

- `ScoreCalculateAPI`
  - compares user answer to `question.correct_answer`
  - correct answer scoring:
    - `easy` → +1
    - `medium` → +2
    - `hard` → +3
  - saves or updates `UserProfile`
  - returns success or failure payload

- `Top50ScoresAPI`
  - groups `UserProfile` by `user.username`
  - sums `score`
  - orders descending by total score
  - limits to 50 results

- `ResetScoreAPI`
  - iterates all `UserProfile` rows for the authenticated user
  - resets `score` to 0 and `step` to 1

### 4.3 Bug / data consistency observations

- `RegisterApi` does not store `email` or incoming `password` despite documentation.
- `QuestionAPI` uses `Question.objects.get(...)` and can break if more than one question exists in a category.
- `SkipQuestionAPI` is logically broken because `UserProfile.objects.get_or_create(user=request.user)` lacks a required `game` value.
- `FinishGameAPI` calls `calculate_user_level(game_score)` but the helper expects a `user` object, not an integer.
- `Top50UserCategoryScoresAPI` queries `category__name`, but the `UserProfile` model field is `game`, causing a lookup failure.
- `main.urls` does not expose several defined service functions, so the effective API surface is smaller than the codebase.

## 5. Security & Middleware

### 5.1 Authentication flow

- Default DRF authentication class: `auth_user.utils.CookieJWTAuthentication`
- Default DRF permission classes:
  - `IsAuthenticated`
  - `AllowAny`
- Effective behavior: by default endpoints require authentication unless decorated with `@permission_classes([AllowAny])`.
- Cookie auth behavior:
  - reads `access_token` from request cookies
  - validates JWT via DRF SimpleJWT token backend
  - does not read `Authorization` header for normal app flow

### 5.2 JWT configuration

- In `settings.py`:
  - `ACCESS_TOKEN_LIFETIME = 60 minutes`
  - `REFRESH_TOKEN_LIFETIME = 7 days`
  - `ROTATE_REFRESH_TOKENS = True`
  - `BLACKLIST_AFTER_ROTATION = True`
  - `AUTH_HEADER_TYPES = ('Bearer',)`
  - `TOKEN_BLACKLIST_ENABLED = True`
- There are also unused constants at the bottom:
  - `ACCESS_TOKEN_LIFETIME = timedelta(days=100)`
  - `REFRESH_TOKEN_LIFETIME = timedelta(days=200)`
  - these are redundant and can be removed in migration.

### 5.3 Middleware stack

- `corsheaders.middleware.CorsMiddleware`
- `django.middleware.common.CommonMiddleware`
- `django.middleware.security.SecurityMiddleware`
- `django.contrib.sessions.middleware.SessionMiddleware`
- `django.middleware.common.CommonMiddleware` (duplicate entry)
- `django.middleware.csrf.CsrfViewMiddleware`
- `django.contrib.auth.middleware.AuthenticationMiddleware`
- `django.contrib.messages.middleware.MessageMiddleware`
- `django.middleware.clickjacking.XFrameOptionsMiddleware`

### 5.4 CORS / headers

- `CORS_ALLOW_ALL_ORIGINS = True`
- `CORS_ALLOW_CREDENTIALS = True`
- Allowed methods: `DELETE`, `GET`, `OPTIONS`, `PATCH`, `POST`, `PUT`
- Allowed headers:
  - `accept`
  - `authorization`
  - `content-type`
  - `user-agent`
  - `x-csrftoken`
  - `x-requested-with`

### 5.5 Cookie settings

- `access_token` and `refresh_token` cookies are set with:
  - `httponly=True`
  - `secure=True`
  - `samesite='Strict'`

> Migration note: `secure=True` requires HTTPS. For local NestJS development, configure cookies appropriately or use environment-specific cookie flags.

### 5.6 Security gaps and migration risks

- Hardcoded Google OAuth credentials in `settings.py`
- `DEBUG = True` is enabled in the codebase and Docker-compose environment
- Duplicate middleware entry and redundant JWT lifetime constants
- Several code paths are defined but not exposed, increasing maintenance risk
- `SkipQuestionAPI` and `FinishGameAPI` contain logic bugs that must be corrected before migrating or enabling

## 6. Environment & Dependencies

### 6.1 Environment variables

- `.env` contains:
  - `DJANGO_SECRET_KEY = django-insecure-uy(6vr*6wb1s8668m0n-+^f9ge&j0c4!kf13f*-=l-#6=67fz-`
- Configured but commented-out environment mapping for Postgres:
  - `DB_NAME`
  - `DB_USER`
  - `DB_PASSWORD`
  - `DB_HOST`
- Hardcoded values in `settings.py`:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI`
- Docker Compose passes:
  - `DEBUG=1`

### 6.2 External service integrations

- Google OAuth2 token verification via `google-auth` and `google-auth-oauthlib`
- No Redis integration detected
- No S3 or cloud object storage integration detected
- No external queue or cache service in current codebase

### 6.3 Requirements / dependencies

- `asgiref==3.9.2`
- `cachetools==6.2.1`
- `certifi==2025.10.5`
- `charset-normalizer==3.4.4`
- `dj-rest-auth==7.0.1`
- `Django==5.2.6`
- `django-allauth==65.12.1`
- `django-cors-headers==4.9.0`
- `django-jazzmin==3.0.1`
- `django-phonenumber-field==8.1.0`
- `djangorestframework==3.16.1`
- `djangorestframework_simplejwt==5.5.1`
- `dotenv==0.9.9`
- `drf-yasg==1.21.11`
- `google-auth==2.41.1`
- `google-auth-httplib2==0.2.0`
- `google-auth-oauthlib==1.2.2`
- `httplib2==0.31.0`
- `idna==3.11`
- `inflection==0.5.1`
- `oauthlib==3.3.1`
- `packaging==25.0`
- `phonenumbers==9.0.14`
- `pillow==11.3.0`
- `pyasn1==0.6.1`
- `pyasn1_modules==0.4.2`
- `PyJWT==2.10.1`
- `pyparsing==3.2.5`
- `python-dotenv==1.1.1`
- `pytz==2025.2`
- `PyYAML==6.0.3`
- `requests==2.32.5`
- `requests-oauthlib==2.0.0`
- `rsa==4.9.1`
- `sqlparse==0.5.3`
- `tzdata==2025.2`
- `uritemplate==4.2.0`
- `urllib3==2.5.0`

### 6.4 Docker and deployment environment

- `Dockerfile`:
  - base image `python:3.11-slim`
  - installs `sqlite3` and `libsqlite3-dev`
  - copies `requirements.txt` and installs dependencies
  - runs `python manage.py collectstatic --noinput || true`
  - exposes port `8000`
  - command: `python manage.py migrate && python manage.py runserver 0.0.0.0:8000`
- `docker-compose.yml`:
  - service `web` builds from project root
  - volume mount `.:/app`
  - exposes `8000:8000`
  - environment variable `DEBUG=1`
  - same run command as Dockerfile

### 6.5 Recommended NestJS migration wiring

- Use two Nest modules: `AuthModule` and `GameModule`
- Map `CookieJWTAuthentication` to NestJS middleware/guards that read HTTP cookies
- Recreate JWT cookie issuance with `SameSite=Strict`, `HttpOnly`, and environment-driven `secure` behavior
- Replace Django file fields with a file upload service storing relative path strings in the DB
- Reimplement `question_index` assignment in the `QuestionService` create flow
- Treat `UserProfile` as a stateful per-question progress record and `UserProgress` as category-level progress
- Preserve `LevelConfig` as a service-driven config table or environment-backed value

---

## 7. Migration Action Items

1. Rebuild the schema exactly as above in TypeORM/Prisma, including custom relations and JSON fields.
2. Recreate cookie-based JWT auth, plus standard token pair/refresh routes if needed.
3. Fix the documented bugs in auth registration, unanswered route definitions, and scoring logic.
4. Expose or remove unused views from the NestJS API surface after confirming frontend contracts.
5. Replace hardcoded Google OAuth secrets with environment variables.
6. Ensure `CORS_ALLOW_ALL_ORIGINS` behavior is migrated to safe NestJS CORS config that supports credentials.
