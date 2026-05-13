import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 1. Глобальный префикс API
  app.setGlobalPrefix('api/v1');

  // 2. Настройка CORS
  app.enableCors();

  // 3. Глобальная валидация
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // 4. Настройка Swagger
  const config = new DocumentBuilder()
    .setTitle('Hayeli API')
    .setDescription('Документация бэкенда для проекта Hayeli. Система авторизации и аналитики.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  
  // Указываем путь 'api/v1/docs'
  // Теперь Swagger будет доступен по адресу: https://твой-домен.railway.app/api/v1/docs
  SwaggerModule.setup('api/v1/docs', app, document);

  // 5. Запуск на динамическом порту Railway
  const port = process.env.PORT || 3000;
  
  // ВАЖНО: используем переменную port вместо жесткого числа 3000
  await app.listen(port, '0.0.0.0');
  
  logger.log(`🚀 API запущен на порту: ${port}`);
  logger.log(`🔗 Базовый URL: /api/v1`);
  logger.log(`📖 Swagger доступен по адресу: /api/v1/docs`);
}
bootstrap();