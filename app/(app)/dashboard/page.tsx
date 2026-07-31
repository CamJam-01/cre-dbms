'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const defaults = { table_density: 'comfortable', show_filters_by_default: false } as const;

type Settings = { table_density: 'comfortable' | 'compact'; show_filters_by_default: boolean };

export default function DashboardPage() {
  const supabase = createClient();
  const [name, setName] = useState('');
  const [settings, setSettings] = useState<Settings>(defaults);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const metadata = data.user?.user_metadata ?? {};
      setName(metadata.full_name ?? data.user?.email?.split('@')[0] ?? 'there');
      setSettings({
        table_density: metadata.table_density === 'compact' ? 'compact' : defaults.table_density,
        show_filters_by_default: metadata.show_filters_by_default === true,
      });
    })();
  }, [supabase]);

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
      <article className="card dashboard-card"><div className="dashboard-kicker">Workspace</div><h2>Land Sales</h2><p className="muted">Search, filter, sort, import, export, and manage your land sale records.</p><a className="btn primary" href="/land-sales">Open Land Sales</a></article>
      <article className="card dashboard-card"><div className="dashboard-kicker">Account</div><h2>Personal settings</h2><p className="muted">Adjust a few display preferences to make the database fit your workflow.</p></article>
    </section>
    <section className="card settings-card"><h2 style={{ marginTop: 0 }}>UX settings</h2><div className="settings-grid">
      <div className="field"><label htmlFor="table-density">Land Sales table density</label><select id="table-density" value={settings.table_density} onChange={e => setSettings(s => ({ ...s, table_density: e.target.value as Settings['table_density'] }))}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select><span className="field-help">Compact shows more records on screen; comfortable gives rows more breathing room.</span></div>
      <label className="checkbox-field"><input type="checkbox" checked={settings.show_filters_by_default} onChange={e => setSettings(s => ({ ...s, show_filters_by_default: e.target.checked }))} /><span><strong>Show Land Sales filters by default</strong><small>Open the filter controls automatically when you visit Land Sales.</small></span></label>
    </div>
      {error && <div className="alert" style={{ marginTop: 16 }}>{error}</div>}{notice && <div className="notice" style={{ marginTop: 16 }}>{notice}</div>}
      <div className="actions"><button className="btn primary" disabled={saving} onClick={saveSettings}>{saving ? 'Saving…' : 'Save preferences'}</button></div>
    </section>
  </main>;
}
