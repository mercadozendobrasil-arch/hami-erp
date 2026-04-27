import { json, RequestHandler } from 'express';

import { RawBodyRequest } from 'src/common/raw-body-request.interface';

export const shopeeWebhookRawBodyMiddleware: RequestHandler = json({
  verify: (req: RawBodyRequest, _res, buffer) => {
    req.rawBody = buffer.toString('utf8');
  },
});
