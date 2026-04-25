import { Injectable } from '@nestjs/common';

import { MediaSdk } from '../../shopee-sdk/modules/media.sdk';
import { UploadImageDto } from './dto/upload-image.dto';

@Injectable()
export class MediaService {
  constructor(private readonly mediaSdk: MediaSdk) {}

  async uploadImage(payload: UploadImageDto) {
    const buffer = Buffer.from(this.normalizeBase64(payload.content), 'base64');
    const uploadResult = await this.mediaSdk.uploadImage({
      image: buffer,
      fileName: payload.fileName ?? `upload-${Date.now()}.jpg`,
    });

    if (uploadResult.image_info?.image_id) {
      return uploadResult;
    }

    if (!uploadResult.upload_id) {
      return uploadResult;
    }

    return this.mediaSdk.getImageUploadResult(uploadResult.upload_id);
  }

  private normalizeBase64(content: string) {
    return content.includes(',') ? (content.split(',')[1] ?? content) : content;
  }
}
