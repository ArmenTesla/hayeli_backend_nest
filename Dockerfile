# Шаг 1: Сборка
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Устанавливаем зависимости
RUN npm install
# Копируем всё содержимое (включая data.json)
COPY . .
# Собираем проект
RUN npm run build

# Шаг 2: Запуск (Финальный образ)
FROM node:20-alpine
WORKDIR /app

# Копируем скомпилированный код и зависимости
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Копируем файл данных в финальный образ
COPY --from=builder /app/data.json ./data.json

EXPOSE 3000
# Запускаем приложение
CMD ["node", "dist/main"]