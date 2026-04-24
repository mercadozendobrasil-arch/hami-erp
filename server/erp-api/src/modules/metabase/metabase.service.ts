import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { RuntimeConfigService } from '../../common/config/runtime-config.service';

type EmbedResource = {
  dashboard?: string;
  question?: string;
};

type EmbedOptions = {
  bordered?: boolean;
  titled?: boolean;
  theme?: 'light' | 'night';
  refreshSeconds?: number;
};

type DashboardEmbedPayload = {
  dashboardId?: string;
  params?: Record<string, unknown>;
  options?: EmbedOptions;
};

type JwtPayload = {
  resource: EmbedResource;
  params: Record<string, unknown>;
  exp: number;
};

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function signJwt(payload: JwtPayload, secret: string) {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac('sha256', secret)
    .update(unsignedToken)
    .digest('base64url');

  return `${unsignedToken}.${signature}`;
}

@Injectable()
export class MetabaseService {
  constructor(private readonly runtimeConfig: RuntimeConfigService) {}

  getEmbedConfig() {
    return {
      enabled: this.runtimeConfig.isMetabaseEmbeddingEnabled(),
      siteUrl: this.runtimeConfig.getMetabaseSiteUrl(),
      defaultDashboardId: this.runtimeConfig.getMetabaseDefaultDashboardId(),
    };
  }

  buildDashboardEmbedUrl(payload: DashboardEmbedPayload) {
    const siteUrl = this.runtimeConfig.getMetabaseSiteUrl();
    const embedSecret = this.runtimeConfig.getMetabaseEmbedSecret();
    const dashboardId =
      payload.dashboardId || this.runtimeConfig.getMetabaseDefaultDashboardId();

    if (!siteUrl || !embedSecret) {
      throw new ServiceUnavailableException(
        'Metabase embedding is not configured. Set METABASE_SITE_URL and METABASE_EMBED_SECRET first.',
      );
    }

    if (!dashboardId) {
      throw new BadRequestException(
        'Missing dashboardId. Provide dashboardId in the request body or set METABASE_DEFAULT_DASHBOARD_ID.',
      );
    }

    const normalizedSiteUrl = siteUrl.replace(/\/+$/, '');
    const token = signJwt(
      {
        resource: { dashboard: dashboardId },
        params: payload.params || {},
        exp: Math.round(Date.now() / 1000) + 60 * 10,
      },
      embedSecret,
    );

    const options = payload.options || {};
    const fragment = new URLSearchParams({
      bordered: String(options.bordered ?? true),
      titled: String(options.titled ?? true),
      ...(options.theme ? { theme: options.theme } : {}),
      ...(options.refreshSeconds ? { refresh: String(options.refreshSeconds) } : {}),
    }).toString();

    return {
      url: `${normalizedSiteUrl}/embed/dashboard/${token}#${fragment}`,
      dashboardId,
      expiresInSeconds: 600,
      params: payload.params || {},
      options: {
        bordered: options.bordered ?? true,
        titled: options.titled ?? true,
        ...(options.theme ? { theme: options.theme } : {}),
        ...(options.refreshSeconds
          ? { refreshSeconds: options.refreshSeconds }
          : {}),
      },
    };
  }
}
