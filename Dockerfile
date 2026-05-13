# Шаг 1: Сборка
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Устанавливаем все зависимости для сборки
RUN npm install
# Копируем всё содержимое (теперь включая data_am.json, data_ru.json, data_en.json)
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

# ИСПРАВЛЕНИЕ: Копируем все языковые файлы вместо одного старого data.json
# Символ * подхватит data_am.json, data_ru.json и data_en.json
COPY --from=builder /app/data_*.json ./

EXPOSE 3000

# Запускаем приложение
CMD ["node", "dist/main"]