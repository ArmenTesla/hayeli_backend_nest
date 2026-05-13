import { Controller, Get, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../../auth/auth/jwt.guard';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('api')
// @UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('getcategory')
  @ApiOperation({ summary: 'List all game categories by language' })
  async getAllCategories(@Headers('accept-language') lang: string) {
    // Извлекаем код языка (например, 'am', 'ru' или 'en'). По умолчанию 'en'.
    const currentLang = lang ? lang.split(',')[0].substring(0, 2).toLowerCase() : 'en';
    
    const categories = await this.categoriesService.findAllByLang(currentLang);
    return { info: categories };
  }
}