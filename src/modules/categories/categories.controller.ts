import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../../auth/auth/jwt.guard';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('api')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('getcategory')
  @ApiOperation({ summary: 'List all game categories' })
  async getAllCategories() {
    const categories = await this.categoriesService.findAll();
    return { info: categories };
  }
}
