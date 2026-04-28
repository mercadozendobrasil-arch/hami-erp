import { InternalServerErrorException } from '@nestjs/common';

import {
  ERP_API_PERMISSIONS,
  ErpApiAccessCredential,
  ErpApiPermission,
} from './erp-api-access.types';

export function resolveErpApiAccessCredentials(env: Record<string, unknown>) {
  const accessConfig =
    typeof env.ERP_API_ACCESS === 'string' ? env.ERP_API_ACCESS.trim() : '';

  if (accessConfig) {
    return parseErpApiAccessConfig(accessConfig);
  }

  const legacyToken =
    typeof env.ERP_API_BEARER_TOKEN === 'string'
      ? env.ERP_API_BEARER_TOKEN.trim()
      : '';

  if (!legacyToken) {
    return [];
  }

  return [
    {
      role: 'legacy-admin',
      token: legacyToken,
      permissions: [...ERP_API_PERMISSIONS],
    } satisfies ErpApiAccessCredential,
  ];
}

export function validateErpApiAccessConfig(env: Record<string, unknown>) {
  const credentials = resolveErpApiAccessCredentials(env);

  if (credentials.length === 0) {
    throw new InternalServerErrorException(
      'Either ERP_API_ACCESS or ERP_API_BEARER_TOKEN must be configured.',
    );
  }

  return env;
}

function parseErpApiAccessConfig(accessConfig: string): ErpApiAccessCredential[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(accessConfig);
  } catch {
    throw new InternalServerErrorException('ERP_API_ACCESS must be valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new InternalServerErrorException(
      'ERP_API_ACCESS must be a JSON object keyed by role.',
    );
  }

  return Object.entries(parsed).map(([role, value]) =>
    parseCredential(role, value),
  );
}

function parseCredential(role: string, value: unknown): ErpApiAccessCredential {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InternalServerErrorException(
      `ERP_API_ACCESS entry "${role}" must be an object.`,
    );
  }

  const token =
    typeof (value as { token?: unknown }).token === 'string'
      ? (value as { token: string }).token.trim()
      : '';
  const permissions = (value as { permissions?: unknown }).permissions;

  if (!token) {
    throw new InternalServerErrorException(
      `ERP_API_ACCESS entry "${role}" must include a non-empty token.`,
    );
  }

  if (!Array.isArray(permissions) || permissions.length === 0) {
    throw new InternalServerErrorException(
      `ERP_API_ACCESS entry "${role}" must include a non-empty permissions array.`,
    );
  }

  const normalizedPermissions = permissions.map((permission) => {
    if (
      typeof permission !== 'string' ||
      !ERP_API_PERMISSIONS.includes(permission as ErpApiPermission)
    ) {
      throw new InternalServerErrorException(
        `ERP_API_ACCESS entry "${role}" contains an invalid permission.`,
      );
    }

    return permission as ErpApiPermission;
  });

  return {
    role,
    token,
    permissions: normalizedPermissions,
  };
}
