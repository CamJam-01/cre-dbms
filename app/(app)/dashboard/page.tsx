import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type DashboardProps = { searchParams: Promise<{ workspace?: string }> };

export default async function DashboardPage({ searchParams }: DashboardProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: workspaces, error: workspaceError } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at');
  const available = workspaces ?? [];
  const requested = (await searchParams).workspace;
  const active = available.find(workspace => workspace.id === requested) ?? available[0];
  const tableIds = active ? (await supabase.from('data_tables').select('id,name,description,is_archived,workspace_id').eq('workspace_id', active.id).order('created_at')).data ?? [] : [];
  const ids = tableIds.map(table => table.id);
  const [{ data: views }, { data: templates }] = active
    ? await Promise.all([
        supabase.from('saved_views').select('*').eq('workspace_id', active.id).order('updated_at', { ascending: false }),
        ids.length ? supabase.from('docx_templates').select('*').in('table_id', ids).order('created_at', { ascending: false }) : Promise.resolve({ data: [] as never[] }),
      ])
    : [{ data: [] }, { data: [] }];
  const tableNames = new Map(tableIds.map(table => [table.id, table.name]));

  return <main className="container">
    <div className="page-head">
      <div><div className="eyebrow">Vantage CRE</div><h1>Dashboard</h1><p className="muted">Your Workspace is the home for Tables, Views, Templates, and members.</p></div>
      {available.length > 0 && <form className="toolbar-actions" method="get"><label className="sr-only" htmlFor="workspace-select">Active Workspace</label><select id="workspace-select" name="workspace" defaultValue={active?.id}><option value="" disabled>Select Workspace</option>{available.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select><button className="btn" type="submit">Switch</button></form>}
    </div>
    {workspaceError && <div className="alert">{workspaceError.message}</div>}
    {!active ? <section className="card empty-card"><h2>No Workspaces yet</h2><p className="muted">Create a Table to create your first Workspace.</p><Link className="btn primary" href="/tables/new">Create Table</Link></section> : <>
      <section className="card dashboard-card"><div className="dashboard-kicker">Active Workspace</div><h2>{active.name}</h2><p className="muted">{tableIds.filter(table => !table.is_archived).length} active Tables · {views?.length ?? 0} saved Views · {templates?.length ?? 0} Templates</p><div className="actions"><Link className="btn primary" href={`/workspaces/${active.id}`}>Open Workspace</Link><Link className="btn" href="/tables/new">Create Table</Link></div></section>
      <section className="dashboard-grid">
        <article className="card"><div className="section-head"><div><div className="section-label">Tables</div><h2>Workspace Tables</h2></div><Link className="btn" href={`/workspaces/${active.id}`}>View all</Link></div>{tableIds.filter(table => !table.is_archived).slice(0, 6).map(table => <Link className="settings-row" key={table.id} href={`/tables/${table.id}`}><span><strong>{table.name}</strong><small className="muted">{table.description || 'No description yet.'}</small></span><span>Open →</span></Link>)}</article>
        <article className="card"><div className="section-head"><div><div className="section-label">Views</div><h2>Saved Views</h2></div></div>{views?.length ? views.slice(0, 6).map(view => <Link className="settings-row" key={view.id} href={`/tables/${view.table_id}?view=${view.id}`}><span><strong>{view.name}</strong><small className="muted">{tableNames.get(view.table_id) ?? 'Table'}</small></span><span>{view.is_shared ? 'Shared' : 'Private'}</span></Link>) : <p className="muted">Save a search from a Table to see it here.</p>}</article>
      </section>
      <section className="card"><div className="section-head"><div><div className="section-label">Templates</div><h2>Shared Templates</h2></div></div>{templates?.length ? <div className="settings-list">{templates.map(template => <div className="settings-row" key={template.id}><span><strong>{template.name}</strong><small className="muted">{tableNames.get(template.table_id) ?? 'Table'}</small></span><span>{template.is_shared ? 'Shared' : 'Private'}</span></div>)}</div> : <p className="muted">Templates uploaded from Table Settings will appear here.</p>}</section>
    </>}
  </main>;
}
