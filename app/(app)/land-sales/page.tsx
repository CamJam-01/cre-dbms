'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Sale = { id: string; property_name: string; address: string; sale_date: string; sale_price: number; acreage: number; seller: string; buyer: string; notes: string };
const empty = { property_name: '', address: '', sale_date: '', sale_price: '', acreage: '', seller: '', buyer: '', notes: '' };

export default function LandSalesPage() {
  const supabase = createClient(); const [rows, setRows] = useState<Sale[]>([]); const [form, setForm] = useState(empty); const [editing, setEditing] = useState<string | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  async function load() { setLoading(true); const { data, error } = await supabase.from('land_sales').select('*').order('sale_date', { ascending: false }); if (error) setError(error.message); else setRows((data ?? []) as Sale[]); setLoading(false); }
  useEffect(() => { load(); }, []);
  function change(key: keyof typeof empty, value: string) { setForm(f => ({ ...f, [key]: value })); }
  function edit(row: Sale) { setEditing(row.id); setForm({ property_name: row.property_name, address: row.address, sale_date: row.sale_date, sale_price: String(row.sale_price), acreage: String(row.acreage), seller: row.seller, buyer: row.buyer, notes: row.notes }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function reset() { setEditing(null); setForm(empty); }
  async function submit(e: FormEvent) { e.preventDefault(); setSaving(true); setError(''); const payload = { ...form, sale_price: Number(form.sale_price), acreage: Number(form.acreage) }; const result = editing ? await supabase.from('land_sales').update(payload).eq('id', editing) : await supabase.from('land_sales').insert(payload); if (result.error) setError(result.error.message); else { reset(); await load(); } setSaving(false); }
  async function remove(id: string) { if (!confirm('Delete this land sale?')) return; setError(''); const { error } = await supabase.from('land_sales').delete().eq('id', id); if (error) setError(error.message); else await load(); }
  const money = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
  return <main className="container"><div className="page-head"><div><h1>Land Sales</h1><div className="muted">Manage land transaction records directly in Supabase.</div></div></div>
    {error && <div className="alert">{error}</div>}
    <section className="card" style={{marginBottom: 20}}><h2 style={{marginTop: 0}}>{editing ? 'Edit land sale' : 'Add land sale'}</h2>
      <form onSubmit={submit}><div className="form-grid">
        {([['property_name','Property name'],['address','Address'],['sale_date','Sale date'],['sale_price','Sale price'],['acreage','Acreage'],['seller','Seller'],['buyer','Buyer']] as const).map(([key,label]) => <div className="field" key={key}><label>{label}</label><input required value={form[key]} type={key === 'sale_date' ? 'date' : key === 'sale_price' || key === 'acreage' ? 'number' : 'text'} step={key === 'sale_price' ? '0.01' : key === 'acreage' ? '0.0001' : undefined} onChange={e => change(key,e.target.value)} /></div>)}
        <div className="field full"><label>Notes</label><textarea rows={3} value={form.notes} onChange={e => change('notes',e.target.value)} /></div>
      </div><div className="actions">{editing && <button type="button" className="btn" onClick={reset}>Cancel</button>}<button className="btn primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add sale'}</button></div></form>
    </section>
    <section className="card"><div className="table-wrap"><table><thead><tr><th>Property</th><th>Address</th><th>Sale date</th><th>Price</th><th>Acres</th><th>Seller</th><th>Buyer</th><th>Notes</th><th></th></tr></thead><tbody>
      {loading ? <tr><td colSpan={9}>Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={9}>No land sales yet. Add the first record above.</td></tr> : rows.map(row => <tr key={row.id}><td><strong>{row.property_name}</strong></td><td>{row.address}</td><td>{row.sale_date}</td><td>{money.format(row.sale_price)}</td><td>{row.acreage}</td><td>{row.seller}</td><td>{row.buyer}</td><td>{row.notes}</td><td><div className="row-actions"><button className="btn" onClick={() => edit(row)}>Edit</button><button className="btn danger" onClick={() => remove(row.id)}>Delete</button></div></td></tr>)}
    </tbody></table></div></section>
  </main>;
}
