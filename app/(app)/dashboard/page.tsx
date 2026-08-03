'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const defaults = { table_density: 'comfortable', show_filters_by_default: false } as const;

type Settings = { table_density: 'comfortable' | 'compact'; show_filters_by_default: boolean };
type DashboardStats = { total: number; averagePrice: number; averageAcreage: number; latestDate: string; latestProperty: string };
const emptyStats: DashboardStats = { total: 0, averagePrice: 0, averageAcreage: 0, latestDate: '', latestProperty: '' };

export default function DashboardPage() {
  const supabase = createClient();
  const [name, setName] = useState('');
  const [settings, setSettings] = useState<Settings>(defaults);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState<DashboardStats>(emptyStats);

  const loadDashboard = useCallback(async () => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const metadata = data.user?.user_metadata ?? {};
      setName(metadata.full_name ?? data.user?.email?.split('@')[0] ?? 'there');
      setSettings({
        table_density: metadata.table_density === 'compact' ? 'compact' : defaults.table_density,
        show_filters_by_default: metadata.show_filters_by_default === true,
      });
      const { data: rows, error: statsError } = await supabase.from('comp_data').select('property_name,sale_date,sale_price,acreage').order('sale_date', { ascending: false });
      if (statsError) { setError(statsError.message); return; }
      const records = rows ?? [];
      const total = records.length;
      const averagePrice = total ? records.reduce((sum, row) => sum + Number(row.sale_price), 0) / total : 0;
      const averageAcreage = total ? records.reduce((sum, row) => sum + Number(row.acreage), 0) / total : 0;
      const latest = records[0];
      setStats({ total, averagePrice, averageAcreage, latestDate: latest?.sale_date ?? '', latestProperty: latest?.property_name ?? '' });
    })();
  }, [supabase]);

  useEffect(() => { void Promise.resolve().then(loadDashboard); }, [loadDashboard]);

  async function saveSettings() {
    setSaving(true); setError(''); setNotice('');
    const { error: updateError } = await supabase.auth.updateUser({ data: settings });
    if (updateError) setError(updateError.message);
    else setNotice('Your preferences have been saved.');
    setSaving(false);
  }

  return <main className="container">
    <div className="page-head"><div><h1>Dashboard</h1><div className="muted">Welcome back, {name || 'there'}.</div></div></div>
    <section className="dashboard-grid">
      <article className="card dashboard-card"><div className="dashboard-kicker">Workspace</div><h2>Data Tables</h2><p className="muted">Create structured tables, manage records, validate fields, and export DOCX reports.</p><Link className="btn primary" href="/data-tables">Open Data Tables</Link></article>
      <article className="card dashboard-card"><div className="dashboard-kicker">Latest activity</div><h2>{stats.latestProperty || 'No records yet'}</h2><p className="muted">{stats.latestDate ? `Most recent sale recorded ${stats.latestDate}.` : 'Create a data table to start building the workspace.'}</p><Link className="btn" href="/data-tables">Review tables</Link></article>
    </section>
    <section className="dashboard-metrics" aria-label="Comp Data summary">
      <article className="metric-card"><span className="metric-label">Total records</span><strong>{stats.total}</strong><small>available comparables</small></article>
      <article className="metric-card"><span className="metric-label">Average sale price</span><strong>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(stats.averagePrice)}</strong><small>across current records</small></article>
      <article className="metric-card"><span className="metric-label">Average acreage</span><strong>{stats.averageAcreage.toFixed(2)}</strong><small>acres per comparable</small></article>
    </section>
    <section className="card settings-card"><h2 style={{ marginTop: 0 }}>UX settings</h2><div className="settings-grid">
      <div className="field"><label htmlFor="table-density">Comp Data table density</label><select id="table-density" value={settings.table_density} onChange={e => setSettings(s => ({ ...s, table_density: e.target.value as Settings['table_density'] }))}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select><span className="field-help">Compact shows more records on screen; comfortable gives rows more breathing room.</span></div>
      <label className="checkbox-field"><input type="checkbox" checked={settings.show_filters_by_default} onChange={e => setSettings(s => ({ ...s, show_filters_by_default: e.target.checked }))} /><span><strong>Show Comp Data filters by default</strong><small>Open the filter controls automatically when you visit Comp Data.</small></span></label>
    </div>
      {error && <div className="alert" style={{ marginTop: 16 }}>{error}</div>}{notice && <div className="notice" style={{ marginTop: 16 }}>{notice}</div>}
      <div className="actions"><button className="btn primary" disabled={saving} onClick={saveSettings}>{saving ? 'Saving…' : 'Save preferences'}</button></div>
    </section>
  </main>;
}
