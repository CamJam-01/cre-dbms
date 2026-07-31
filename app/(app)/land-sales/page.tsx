'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LandSalesTable } from '@/components/land-sales-table';
import type { SaleRecord } from '@/lib/land-sales-utils';

type SaleForm = { property_name: string; address: string; sale_date: string; sale_price: string; acreage: string; seller: string; buyer: string; notes: string };
const empty: SaleForm = { property_name: '', address: '', sale_date: '', sale_price: '', acreage: '', seller: '', buyer: '', notes: '' };

export default function LandSalesPage() {
  const supabase = createClient(); const [rows, setRows] = useState<SaleRecord[]>([]); const [form, setForm] = useState(empty); const [editing, setEditing] = useState<string | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  async function load() { setLoading(true); const { data, error: loadError } = await supabase.from('land_sales').select('*').order('sale_date', { ascending: false }); if (loadError) setError(loadError.message); else setRows((data ?? []) as SaleRecord[]); setLoading(false); }
  useEffect(() => { void load(); }, []);
  function change(key: keyof SaleForm, value: string) { setForm(current => ({ ...current, [key]: value })); }
  function edit(row: SaleRecord) { setEditing(row.id); setForm({ property_name: row.property_name, address: row.address, sale_date: row.sale_date, sale_price: String(row.sale_price), acreage: String(row.acreage), seller: row.seller, buyer: row.buyer, notes: row.notes }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function reset() { setEditing(null); setForm(empty); }
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setError(''); const payload = { ...form, sale_price: Number(form.sale_price), acreage: Number(form.acreage) }; const result = editing ? await supabase.from('land_sales').update(payload).eq('id', editing) : await supabase.from('land_sales').insert(payload); if (result.error) setError(result.error.message); else { reset(); await load(); } setSaving(false); }
  async function remove(id: string) { if (!confirm('Delete this land sale?')) return; setError(''); const { error: deleteError } = await supabase.from('land_sales').delete().eq('id', id); if (deleteError) setError(deleteError.message); else await load(); }
  return <main className="container"><div className="page-head"><div><h1>Land Sales</h1><div className="muted">Search, filter, sort, import, and export land transaction records.</div></div></div>{error && <div className="alert">{error}</div>}
    <section className="card" style={{ marginBottom: 20 }}><h2 style={{ marginTop: 0 }}>{editing ? 'Edit land sale' : 'Add land sale'}</h2><form onSubmit={submit}><div className="form-grid">
      {([['property_name','Property name'],['address','Address'],['sale_date','Sale date'],['sale_price','Sale price'],['acreage','Acreage'],['seller','Seller'],['buyer','Buyer']] as const).map(([key,label]) => <div className="field" key={key}><label>{label}</label><input required value={form[key]} type={key === 'sale_date' ? 'date' : key === 'sale_price' || key === 'acreage' ? 'number' : 'text'} step={key === 'sale_price' ? '0.01' : key === 'acreage' ? '0.0001' : undefined} onChange={e => change(key,e.target.value)} /></div>)}
      <div className="field full"><label>Notes</label><textarea rows={3} value={form.notes} onChange={e => change('notes',e.target.value)} /></div></div><div className="actions">{editing && <button type="button" className="btn" onClick={reset}>Cancel</button>}<button className="btn primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add sale'}</button></div></form></section>
    {loading ? <section className="card">Loading land sales…</section> : <LandSalesTable rows={rows} onEdit={edit} onDelete={remove} onReload={load} />}
  </main>;
}
