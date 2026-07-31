export type SaleRecord = {
  id: string;
  property_name: string;
  address: string;
  sale_date: string;
  sale_price: number;
  acreage: number;
  seller: string;
  buyer: string;
  notes: string;
};

export type SortKey = keyof Pick<SaleRecord, 'property_name' | 'address' | 'sale_date' | 'sale_price' | 'acreage' | 'seller' | 'buyer' | 'notes'>;
export type SortDirection = 'asc' | 'desc';

export const defaultSort = { key: 'sale_date' as SortKey, direction: 'desc' as SortDirection };
export const csvHeaders = ['Property Name', 'Address', 'Sale Date', 'Sale Price', 'Acreage', 'Seller', 'Buyer', 'Notes'];
export const csvFields: SortKey[] = ['property_name', 'address', 'sale_date', 'sale_price', 'acreage', 'seller', 'buyer', 'notes'];

export function recordKey(record: Omit<SaleRecord, 'id'> | SaleRecord) {
  return [record.property_name, record.address, record.sale_date, Number(record.sale_price).toFixed(2), Number(record.acreage).toFixed(4), record.seller, record.buyer, record.notes]
    .map(value => String(value).trim().toLowerCase()).join('|');
}

export function csvCell(value: string | number) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function makeCsv(rows: SaleRecord[]) {
  return [csvHeaders.join(','), ...rows.map(row => csvFields.map(field => csvCell(row[field])).join(','))].join('\r\n');
}

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"') {
      if (quoted && next === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell); cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell); cell = '';
      if (row.some(value => value.trim() !== '')) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell);
  if (row.some(value => value.trim() !== '')) rows.push(row);
  return rows;
}
