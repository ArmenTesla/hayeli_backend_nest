import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Глобальный префикс API
  app.setGlobalPrefix('api/v1');

  // Настройка CORS (разрешаем запросы с любых источников)
  app.enableCors();

  // Глобальная валидация входящих данных
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,       // Игнорировать поля, которых нет в DTO
    transform: true,       // Автоматически преобразовывать типы (например, string в number)
    forbidNonWhitelisted: true, // Выдавать ошибку, если прислали лишние поля
  }));

  // Настройка Swagger документации
  const config = new DocumentBuilder()
    .setTitle('Hayeli API')
    .setDescription('Документация бэкенда для проекта Hayeli. Система авторизации и аналитики.')
    .setVersion('1.0')
    .addBearerAuth() // Возможность тестировать закрытые токены в Swagger
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(3000, '0.0.0.0');
  
  logger.log(`🚀 API запущен на: http://localhost:${port}/api/v1`);
  logger.log(`📖 Swagger документация: http://localhost:${port}/docs`);
}
bootstrap();