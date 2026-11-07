import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Module,
  Param,
  Patch,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminRole } from '@prisma/client';
import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import {
  JwtAuthGuard,
  Permissions,
  Roles,
  RolesGuard,
  requireUser,
  LoginRateLimiter,
} from './admin-auth';
import {
  CreateHomepagePromotionDto,
  HomepagePromotionsListDto,
  ReorderHomepagePromotionsDto,
  UpdateHomepagePromotionDto,
} from './homepage-promotions.dto';
import { HomepagePromotionsService } from './homepage-promotions.service';
import { PERMISSIONS } from './permissions';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_CONFIGURABLE_IMAGE_SIZE = 20 * 1024 * 1024;
const configuredImageSize = Number(
  process.env.HOMEPAGE_PROMOTION_MAX_UPLOAD_BYTES ?? MAX_IMAGE_SIZE,
);
const uploadImageSize =
  Number.isSafeInteger(configuredImageSize) &&
  configuredImageSize >= 1024 * 1024 &&
  configuredImageSize <= MAX_CONFIGURABLE_IMAGE_SIZE
    ? configuredImageSize
    : MAX_IMAGE_SIZE;
const MAX_IMAGE_PIXELS = 20_000_000;
const acceptedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
const mimeByFormat = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' } as const;
const extensionByFormat = { png: 'png', jpeg: 'jpg', webp: 'webp' } as const;
const uploadRateLimiter = new LoginRateLimiter(
  'HOMEPAGE_PROMOTION_UPLOAD_RATE_LIMIT',
  'HOMEPAGE_PROMOTION_UPLOAD_RATE_WINDOW_SECONDS',
);

export async function inspectPromotionImage(buffer: Buffer) {
  try {
    const metadata = await sharp(buffer, {
      failOn: 'error',
      limitInputPixels: MAX_IMAGE_PIXELS,
    }).metadata();
    if (metadata.format !== 'png' && metadata.format !== 'jpeg' && metadata.format !== 'webp') {
      throw new Error('Unsupported decoded image format.');
    }
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width * metadata.height > MAX_IMAGE_PIXELS
    ) {
      throw new Error('Image dimensions are invalid.');
    }
    // Force a full decode so a valid-looking header with corrupt/truncated image data is rejected.
    await sharp(buffer, { failOn: 'error', limitInputPixels: MAX_IMAGE_PIXELS }).stats();
    return {
      format: metadata.format,
      mimeType: mimeByFormat[metadata.format],
      extension: extensionByFormat[metadata.format],
      width: metadata.width,
      height: metadata.height,
    };
  } catch {
    throw new BadRequestException('The file is not a valid PNG, JPG, or WEBP image.');
  }
}

@Controller('homepage-promotions')
export class PublicHomepagePromotionsController {
  constructor(
    @Inject(HomepagePromotionsService) private readonly service: HomepagePromotionsService,
  ) {}

  @Get()
  list() {
    return this.service.publicPromotions();
  }
}

type AdminRequest = { user?: ReturnType<typeof requireUser>; ip?: string };

type UploadedImage =
  | {
      buffer: Buffer;
      mimetype: string;
      size: number;
    }
  | undefined;

@Controller('admin/homepage-promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.DESIGNER)
export class AdminHomepagePromotionsController {
  constructor(
    @Inject(HomepagePromotionsService) private readonly service: HomepagePromotionsService,
  ) {}

  @Permissions(PERMISSIONS.HOMEPAGE_PROMOTIONS_MANAGE)
  @Get()
  list(@Query() query: HomepagePromotionsListDto) {
    return this.service.list(query.page, query.limit);
  }

  @Permissions(PERMISSIONS.HOMEPAGE_PROMOTIONS_MANAGE)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Permissions(PERMISSIONS.HOMEPAGE_PROMOTIONS_MANAGE)
  @Post()
  create(@Body() body: CreateHomepagePromotionDto, @Req() request: AdminRequest) {
    return this.service.create(body, requireUser(request).id);
  }

  @Permissions(PERMISSIONS.HOMEPAGE_PROMOTIONS_MANAGE)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateHomepagePromotionDto,
    @Req() request: AdminRequest,
  ) {
    return this.service.update(id, body, requireUser(request).id);
  }

  @Permissions(PERMISSIONS.HOMEPAGE_PROMOTIONS_MANAGE)
  @Post('reorder')
  reorder(@Body() body: ReorderHomepagePromotionsDto, @Req() request: AdminRequest) {
    return this.service.reorder(body, requireUser(request).id);
  }

  @Permissions(PERMISSIONS.HOMEPAGE_PROMOTIONS_MANAGE)
  @Post(':id/publish')
  publish(@Param('id') id: string, @Req() request: AdminRequest) {
    return this.service.publish(id, requireUser(request).id);
  }

  @Permissions(PERMISSIONS.HOMEPAGE_PROMOTIONS_MANAGE)
  @Post(':id/unpublish')
  unpublish(@Param('id') id: string, @Req() request: AdminRequest) {
    return this.service.unpublish(id, requireUser(request).id);
  }

  @Permissions(PERMISSIONS.HOMEPAGE_PROMOTIONS_MANAGE)
  @Delete(':id')
  delete(@Param('id') id: string, @Req() request: AdminRequest) {
    return this.service.delete(id, requireUser(request).id);
  }

  @Permissions(PERMISSIONS.HOMEPAGE_PROMOTIONS_MANAGE)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: uploadImageSize },
      fileFilter: (_request, file, callback) =>
        callback(
          acceptedMimeTypes.includes(file.mimetype)
            ? null
            : new BadRequestException('Use a PNG, JPG, or WEBP image.'),
          acceptedMimeTypes.includes(file.mimetype),
        ),
    }),
  )
  async upload(@UploadedFile() file: UploadedImage, @Req() request: AdminRequest) {
    if (!uploadRateLimiter.check(`homepage-promotion-upload:${request.ip ?? 'unknown'}`))
      throw new HttpException(
        'Too many poster uploads. Please wait before trying again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    if (!file) throw new BadRequestException('Choose a PNG, JPG, or WEBP image to upload.');
    if (file.size > uploadImageSize)
      throw new BadRequestException(
        `Images must be ${Math.ceil(uploadImageSize / (1024 * 1024))} MB or smaller.`,
      );
    const image = await inspectPromotionImage(file.buffer);
    if (file.mimetype !== image.mimeType)
      throw new BadRequestException('The selected file type does not match its image content.');
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw new ServiceUnavailableException('Image uploads are not configured yet.');
    const key = `college-confession/promotions/${randomUUID()}.${image.extension}`;
    const blob = await put(key, file.buffer, {
      access: 'public',
      contentType: image.mimeType,
      addRandomSuffix: false,
      token,
    });
    return {
      url: blob.url,
      key: blob.pathname,
      width: image.width,
      height: image.height,
      size: file.size,
    };
  }
}

@Module({
  controllers: [PublicHomepagePromotionsController, AdminHomepagePromotionsController],
  providers: [HomepagePromotionsService, JwtAuthGuard, RolesGuard],
})
export class HomepagePromotionsModule {}
