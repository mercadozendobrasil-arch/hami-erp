import { useQuery } from '@tanstack/react-query';
import { history, useLocation } from '@umijs/max';
import { useEffect, useMemo } from 'react';
import { queryShops } from '@/services/erp/shop';

export function useResolvedShopId() {
  const location = useLocation();
  const queryShopId = useMemo(
    () => new URLSearchParams(location.search).get('shopId') || undefined,
    [location.search],
  );

  const { data: shopsResponse, isFetching } = useQuery({
    queryKey: ['resolved-shop-context'],
    queryFn: () => queryShops({ current: 1, pageSize: 100 }),
    enabled: !queryShopId,
  });

  const firstShopId = shopsResponse?.data?.[0]?.shopId;
  const resolvedShopId = queryShopId || firstShopId;

  useEffect(() => {
    if (queryShopId || !firstShopId) {
      return;
    }

    const search = new URLSearchParams(location.search);
    search.set('shopId', firstShopId);
    history.replace(`${location.pathname}?${search.toString()}`);
  }, [firstShopId, location.pathname, location.search, queryShopId]);

  return { isFetchingShop: isFetching, shopId: resolvedShopId };
}
