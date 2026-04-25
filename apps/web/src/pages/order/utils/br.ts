export function formatBrazilCurrency(amount: string | number, currency = 'BRL') {
  const value = typeof amount === 'number' ? amount : Number(amount || 0);
  if (!Number.isFinite(value)) {
    return `${currency} 0.00`;
  }

  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatBrazilPostalCode(value?: string) {
  if (!value) {
    return '-';
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length !== 8) {
    return value;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function formatBrazilTaxId(value?: string) {
  if (!value) {
    return '-';
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  return value;
}

export function formatBrazilPhone(value?: string) {
  if (!value) {
    return '-';
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return value;
}

export function formatBrazilAddress(address: ERP.AddressInfo) {
  return [
    address.addressLine1,
    address.addressLine2,
    address.district,
    address.city,
    address.state,
    formatBrazilPostalCode(address.zipCode),
    address.countryCode || address.country,
  ]
    .filter((item) => Boolean(item) && item !== '-')
    .join(', ');
}
