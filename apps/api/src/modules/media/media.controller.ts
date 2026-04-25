import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { UploadImageDto } from './dto/upload-image.dto';
import { MediaService } from './media.service';

@ApiTags('shopee-media')
@Controller('shopee/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('images')
  uploadImage(@Body() payload: UploadImageDto) {
    return this.mediaService.uploadImage(payload);
  }
}
