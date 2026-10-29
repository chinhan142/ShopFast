import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Products & Catalog')
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm có bộ lọc (danh mục, giá, thương hiệu, tìm kiếm) và phân trang' })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm kèm metadata phân trang' })
  findAll(@Query() query: GetProductsQueryDto) {
    return this.productsService.findAll(query);
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Lấy danh sách tất cả danh mục sản phẩm' })
  @ApiResponse({ status: 200, description: 'Danh sách danh mục và số lượng sản phẩm' })
  findAllCategories() {
    return this.productsService.findAllCategories();
  }

  @Public()
  @Get('sku/:sku')
  @ApiOperation({ summary: 'Tra cứu sản phẩm theo mã SKU (Dùng cho AI Agent và Khách hàng)' })
  @ApiResponse({ status: 200, description: 'Chi tiết sản phẩm' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy SKU' })
  findBySku(@Param('sku') sku: string) {
    return this.productsService.findBySku(sku);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết sản phẩm theo ID' })
  @ApiResponse({ status: 200, description: 'Chi tiết sản phẩm' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo sản phẩm mới (Dành cho Quản trị viên / Nhân viên kho)' })
  @ApiResponse({ status: 201, description: 'Tạo sản phẩm thành công' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật thông tin / giá / tồn kho sản phẩm (Dành cho Kho)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }
}
