// backend/src/modules/products/products.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Req } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, CreateVariantDto } from './dto/product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Req() req: any, @Body() createProductDto: CreateProductDto) {
    return this.productsService.create(req.user.id, createProductDto);
  }

  @Post(':productId/variants')
  createVariant(
    @Req() req: any,
    @Param('productId') productId: string,
    @Body() createVariantDto: CreateVariantDto,
  ) {
    return this.productsService.createVariant(req.user.id, productId, createVariantDto);
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.productsService.searchProducts(query);
  }

  @Get('low-stock')
  getLowStock() {
    return this.productsService.getLowStockProducts();
  }

  @Get('sku/:sku')
  findBySku(@Param('sku') sku: string) {
    return this.productsService.findBySku(sku);
  }

  @Get('variant-sku/:variantSku')
  findByVariantSku(@Param('variantSku') variantSku: string) {
    return this.productsService.findByVariantSku(variantSku);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(req.user.id, id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}