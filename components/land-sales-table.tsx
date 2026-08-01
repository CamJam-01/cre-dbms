'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { csvHeaders, defaultSort, makeCsv, parseCsv, recordKey, SaleRecord, SortKey, validDate } from '@/lib/land-sales-utils';

export function LandSalesTable({ rows, onEdit, onDelete, onReload }: { rows: SaleRecord[]; onEdit: (row: SaleRecord) => void; onDelete: (id: string) => Promise<void>; onReload: () => Promise<void> }) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [keyword, setKeyword] = useState('');
  const [minPrice, setMinPrice] = useState(''); const [maxPrice, setMaxPrice] = useState('');
  const [minAcreage, setMinAcreage] = useState(''); const [maxAcreage, setMaxAcreage] = useState('');
  const [fromDate, setFromDate] = useState(''); const [toDate, setToDate] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false); const [sort, setSort] = useState(defaultSort);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [notice, setNotice] = useState(''); const [error, setError] = useState(''); const [importing, setImporting] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const metadata = data.user?.user_metadata ?? {};
      setFiltersOpen(metadata.show_filters_by_default === true);
      setDensity(metadata.table_density === 'compact' ? 'compact' : 'comfortable');
    })();
  }, []);

  const filteredRows = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    const minP = minPrice === '' ? null : Number(minPrice); const maxP = maxPrice === '' ? null : Number(maxPrice);
    const minA = minAcreage === '' ? null : Number(minAcreage); const maxA = maxAcreage === '' ? null : Number(maxAcreage);
    const filtered = rows.filter(row => {
      const searchable = [row.property_name, row.address, row.sale_date, row.sale_price, row.acreage, row.seller, row.buyer, row.notes].join(' ').toLowerCase();
      return (!term || searchable.includes(term)) && (minP === null || row.sale_price >= minP) && (maxP === null || row.sale_price <= maxP) && (minA === null || row.acreage >= minA) && (maxA === null || row.acreage <= maxA) && (!fromDate || row.sale_date >= fromDate) && (!toDate || row.sale_date <= toDate);
    });
    return [...filtered].sort((a, b) => {
      const av = a[sort.key]; const bv = b[sort.key];
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [rows, keyword, minPrice, maxPrice, minAcreage, maxAcreage, fromDate, toDate, sort]);

  function cycleSort(key: SortKey) {
    if (sort.key !== key) setSort({ key, direction: 'asc' });
    else if (sort.direction === 'asc') setSort({ key, direction: 'desc' });
    else setSort(defaultSort);
  }
  function clearFilters() { setKeyword(''); setMinPrice(''); setMaxPrice(''); setMinAcreage(''); setMaxAcreage(''); setFromDate(''); setToDate(''); }
  function exportCsv() {
    const url = URL.createObjectURL(new Blob([makeCsv(filteredRows)], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = `land-sales-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    setImporting(true); setError(''); setNotice('');
    try {
      const parsed = parseCsv(await file.text());
      if (parsed.length < 2) throw new Error('The CSV must contain a header row and at least one data row.');
      const expected = csvHeaders.map(header => header.toLowerCase()); const headers = parsed[0].map(header => header.trim().toLowerCase());
      if (headers.length !== expected.length || headers.some((header, index) => header !== expected[index])) throw new Error(`CSV headers must be exactly: ${csvHeaders.join(', ')}`);
      const { data: existing, error: existingError } = await supabase.from('land_sales').select('property_name,address,sale_date,sale_price,acreage,seller,buyer,notes');
      if (existingError) throw new Error(existingError.message);
      const known = new Set((existing ?? []).map(row => recordKey(row as Omit<SaleRecord, 'id'>))); const incoming = new Set<string>();
      const records: Omit<SaleRecord, 'id'>[] = []; let duplicates = 0;
      parsed.slice(1).forEach((values, index) => {
        if (values.length !== expected.length) throw new Error(`Row ${index + 2} has the wrong number of columns.`);
        const [property_name, address, sale_date, priceText, acreageText, seller, buyer, notes] = values.map(value => value.trim());
        const sale_price = Number(priceText); const acreage = Number(acreageText);
        const rowNumber = index + 2;
        const requiredValues = [['Property Name', property_name], ['Address', address], ['Sale Date', sale_date], ['Sale Price', priceText], ['Acreage', acreageText], ['Seller', seller], ['Buyer', buyer]] as const;
        for (const [field, value] of requiredValues) {
          if (!value) throw new Error(`Row ${rowNumber}, ${field}: value is missing. Enter a value and retry the import.`);
        }
        if (!validDate(sale_date)) throw new Error(`Row ${rowNumber}, Sale Date: "${sale_date}" is not a valid YYYY-MM-DD date. Use a date such as 2026-07-31.`);
        if (!Number.isFinite(sale_price) || sale_price < 0) throw new Error(`Row ${rowNumber}, Sale Price: "${priceText}" is not a valid non-negative number. Enter a numeric value such as 50000.`);
        if (!Number.isFinite(acreage) || acreage <= 0) throw new Error(`Row ${rowNumber}, Acreage: "${acreageText}" is not a valid positive number. Enter a value greater than zero, such as 2.5.`);
        const record = { property_name, address, sale_date, sale_price, acreage, seller, buyer, notes }; const key = recordKey(record);
        if (known.has(key) || incoming.has(key)) { duplicates += 1; return; } incoming.add(key); records.push(record);
      });
      if (records.length) { const { error: insertError } = await supabase.from('land_sales').insert(records); if (insertError) throw new Error(insertError.message); await onReload(); }
      setNotice(`Import complete. ${records.length} record${records.length === 1 ? '' : 's'} imported${duplicates ? `; ${duplicates} duplicate${duplicates === 1 ? '' : 's'} skipped` : ''}.`);
    } catch (importError) { setError(importError instanceof Error ? importError.message : 'The CSV could not be imported.'); }
    finally { setImporting(false); }
  }

  const money = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
  const columns: { key: SortKey; label: string }[] = [{ key: 'property_name', label: 'Property' }, { key: 'address', label: 'Address' }, { key: 'sale_date', label: 'Sale date' }, { key: 'sale_price', label: 'Price' }, { key: 'acreage', label: 'Acres' }, { key: 'seller', label: 'Seller' }, { key: 'buyer', label: 'Buyer' }, { key: 'notes', label: 'Notes' }];
  return <>
    {error && <div className="alert">{error}</div>}{notice && <div className="notice">{notice}</div>}
    <section className="card" style={{ marginBottom: 20 }}><div className="toolbar"><div className="search-field"><label htmlFor="sale-search">Search records</label><input id="sale-search" placeholder="Search property, address, buyer, seller, notes…" value={keyword} onChange={e => setKeyword(e.target.value)} /></div><div className="toolbar-actions"><button type="button" className="btn" onClick={() => setFiltersOpen(v => !v)}>{filtersOpen ? 'Hide filters' : 'Show filters'}</button><button type="button" className="btn" onClick={clearFilters}>Clear filters</button></div></div>
      {filtersOpen && <div className="filter-grid"><div className="field"><label>Minimum sale price</label><input type="number" min="0" step="0.01" placeholder="e.g. 50000" value={minPrice} onChange={e => setMinPrice(e.target.value)} /></div><div className="field"><label>Maximum sale price</label><input type="number" min="0" step="0.01" placeholder="e.g. 250000" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} /></div><div className="field"><label>Minimum acreage</label><input type="number" min="0" step="0.0001" placeholder="e.g. 2.1" value={minAcreage} onChange={e => setMinAcreage(e.target.value)} /></div><div className="field"><label>Maximum acreage</label><input type="number" min="0" step="0.0001" placeholder="e.g. 3.5" value={maxAcreage} onChange={e => setMaxAcreage(e.target.value)} /></div><div className="field"><label>Sale date from</label><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div><div className="field"><label>Sale date to</label><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></div></div>}
    </section>
    <section className={`card ${density === 'compact' ? 'table-compact' : ''}`}><div className="table-toolbar"><div className="muted">Showing <strong>{filteredRows.length}</strong> of <strong>{rows.length}</strong> records</div><div className="toolbar-actions"><input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={importCsv} hidden /><button type="button" className="btn" disabled={importing} onClick={() => fileInputRef.current?.click()}>{importing ? 'Importing…' : 'Import CSV'}</button><button type="button" className="btn primary" disabled={filteredRows.length === 0} onClick={exportCsv}>Export CSV</button></div></div><div className="table-help muted">Click a column header to sort ascending, descending, then return to the default order.</div>
      <div className="table-wrap"><table><thead><tr>{columns.map(column => { const active = sort.key === column.key; const indicator = active ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''; return <th key={column.key}><button type="button" className="sort-button" onClick={() => cycleSort(column.key)}>{column.label}{indicator}</button></th>; })}<th>Actions</th></tr></thead><tbody>{filteredRows.length === 0 ? <tr><td colSpan={9}>No records match the current search and filters.</td></tr> : filteredRows.map(row => <tr key={row.id}><td><strong>{row.property_name}</strong></td><td>{row.address}</td><td>{row.sale_date}</td><td>{money.format(row.sale_price)}</td><td>{row.acreage}</td><td>{row.seller}</td><td>{row.buyer}</td><td>{row.notes}</td><td><div className="row-actions"><button type="button" className="btn" onClick={() => onEdit(row)}>Edit</button><button type="button" className="btn danger" onClick={() => onDelete(row.id)}>Delete</button></div></td></tr>)}</tbody></table></div>
    </section>
  </>;
}
