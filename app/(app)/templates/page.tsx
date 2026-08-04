import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: templates, error } = await supabase
    .from('docx_templates')
    .select('id, table_id, name, description, supported_fields, created_at')
    .order('created_at', { ascending: false });
  const tableIds = [...new Set((templates ?? []).map(template => template.table_id))];
  const { data: tables } = tableIds.length
    ? await supabase.from('data_tables').select('id, name').in('id', tableIds)
    : { data: [] as Array<{ id: string; name: string }> };
  const tableNames = new Map((tables ?? []).map(table => [table.id, table.name]));

  return <main className="container">
    <div className="page-head">
      <div><div className="eyebrow">Document exports</div><h1>Templates</h1><p className="muted">Browse the Word templates available for your accessible data tables.</p></div>
      <Link className="btn" href="/data-tables">Open Data Tables</Link>
    </div>
    {error && <div className="alert">{error.message}</div>}
    {!error && templates?.length === 0 && <section className="card empty-card"><h2>No templates yet</h2><p className="muted">Upload a .docx template from a table’s settings page to make it available for exports.</p><Link className="btn primary" href="/data-tables">Choose a table</Link></section>}
    {templates && templates.length > 0 && <section className="card"><div className="section-head"><div><div className="section-label">Saved Word templates</div><p className="muted">Templates remain private to the tables that own them.</p></div></div><div className="settings-list">{templates.map(template => <div className="settings-row" key={template.id}><div><strong>{template.name}</strong><div className="muted">{tableNames.get(template.table_id) ?? 'Unavailable table'}{template.description ? ` · ${template.description}` : ''}</div></div><Link className="btn" href={`/data-tables/${template.table_id}/settings`}>Manage table</Link></div>)}</div></section>}
  </main>;
}
