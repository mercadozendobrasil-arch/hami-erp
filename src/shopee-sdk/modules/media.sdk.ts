import { Injectable } from '@nestjs/common';

import { ShopeeHttpClient } from '../../common/shopee/shopee-http.client';

export interface ShopeeUploadImagePayload {
  image: Buffer | Uint8Array;
  fileName: string;
}

@Injectable()
export class MediaSdk {
  constructor(private readonly shopeeHttpClient: ShopeeHttpClient) {}

  uploadImage(payload: ShopeeUploadImagePayload) {
    return this.shopeeHttpClient.request<{
      image_info?: {
        image_id: string;
        image_url?: string;
      };
      upload_id?: string;
    }>({
      method: 'POST',
      path: '/media_space/upload_image',
      contentType: 'multipart/form-data',
      body: {
        image: new Blob([new Uint8Array(payload.image)]),
        file_name: payload.fileName,
      },
    });
  }

  getImageUploadResult(uploadId: string) {
    return this.shopeeHttpClient.request<{
      image_info?: {
        image_id: string;
        image_url?: string;
        status?: string;
      };
    }>({
      method: 'GET',
      path: '/media_space/get_image_upload_result',
      query: {
        upload_id: uploadId,
      },
    });
  }
}
