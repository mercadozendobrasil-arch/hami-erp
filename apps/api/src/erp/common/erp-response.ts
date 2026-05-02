export interface ErpListResponse<T> {
  success: true;
  data: T[];
  total: number;
}

export interface ErpDataResponse<T> {
  success: true;
  data: T;
}

export function erpList<T>(data: T[], total = data.length): ErpListResponse<T> {
  return {
    success: true,
    data,
    total,
  };
}

export function erpData<T>(data: T): ErpDataResponse<T> {
  return {
    success: true,
    data,
  };
}
