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

export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validateImportRows(rows: string[][]) {
  if (rows.length === 0) throw new Error(`Header error: the CSV is empty. Add this header row: ${csvHeaders.join(', ')}.`);
  if (rows.length === 1) throw new Error('The CSV contains a header row but no data rows. Add at least one comparable and retry.');

  const headers = rows[0].map(header => header.trim());
  if (headers.length !== csvHeaders.length) throw new Error(`Header error: found ${headers.length} columns, but ${csvHeaders.length} are required. Expected: ${csvHeaders.join(', ')}.`);
  for (let index = 0; index < csvHeaders.length; index += 1) {
    if (headers[index].toLowerCase() !== csvHeaders[index].toLowerCase()) {
      throw new Error(`Header error: expected "${csvHeaders[index]}" as column ${index + 1}, but found "${headers[index] || '(blank)'}". Rename or reorder the column and retry.`);
    }
  }

  rows.slice(1).forEach((values, index) => {
    const rowNumber = index + 2;
    if (values.length !== csvHeaders.length) throw new Error(`Row ${rowNumber} has ${values.length} columns, but ${csvHeaders.length} are required. Check for missing commas or incorrectly formatted quoted values.`);
    const [propertyName, address, saleDate, priceText, acreageText, seller, buyer] = values.map(value => value.trim());
    const requiredValues = [
      ['Property Name', propertyName], ['Address', address], ['Sale Date', saleDate], ['Sale Price', priceText],
      ['Acreage', acreageText], ['Seller', seller], ['Buyer', buyer],
    ];
    for (const [field, value] of requiredValues) {
      if (!value) throw new Error(`Row ${rowNumber}, ${field}: value is missing. Enter a value and retry the import.`);
    }
    if (!validDate(saleDate)) throw new Error(`Row ${rowNumber}, Sale Date: "${saleDate}" is not a valid YYYY-MM-DD date. Use a date such as 2026-07-31.`);
    const salePrice = Number(priceText);
    if (!Number.isFinite(salePrice) || salePrice < 0) throw new Error(`Row ${rowNumber}, Sale Price: "${priceText}" is not a valid non-negative number. Enter a numeric value such as 50000.`);
    const acreage = Number(acreageText);
    if (!Number.isFinite(acreage) || acreage <= 0) throw new Error(`Row ${rowNumber}, Acreage: "${acreageText}" is not a valid positive number. Enter a value greater than zero, such as 2.5.`);
  });
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
  if (quoted) throw new Error('CSV format error: an opening quote is missing a closing quote. Check quoted values and retry.');
  row.push(cell);
  if (row.some(value => value.trim() !== '')) rows.push(row);
  validateImportRows(rows);
  return rows;
}
