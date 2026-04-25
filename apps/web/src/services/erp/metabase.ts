import { request } from '@umijs/max';

export async function getMetabaseEmbedConfig() {
  const response = await request<ERP.ApiResponse<ERP.MetabaseEmbedConfig>>(
    '/api/metabase/embed/config',
    {
      method: 'GET',
    },
  );

  return response.data;
}

export async function buildMetabaseDashboardEmbed(
  payload: ERP.MetabaseDashboardEmbedRequest,
) {
  const response = await request<ERP.ApiResponse<ERP.MetabaseDashboardEmbedData>>(
    '/api/metabase/embed/dashboard',
    {
      method: 'POST',
      data: payload,
    },
  );

  return response.data;
}
