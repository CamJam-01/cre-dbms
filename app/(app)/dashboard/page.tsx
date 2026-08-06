import Link from 'next/link';
import { DashboardWorkspaceClient } from '@/components/dashboard-workspace-client';
import { WorkspaceMember } from '@/lib/data-tables';
import { createClient } from '@/lib/supabase/server';

type DashboardProps = { searchParams: Promise<{ workspace?: string }> };

export default async function DashboardPage({ searchParams }: DashboardProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: workspaces, error: workspaceError } = await supabase.from('workspaces').select('*').order('created_at');
  const available = workspaces ?? [];
  const requested = (await searchParams).workspace;
  const active = available.find(workspace => workspace.id === requested) ?? available[0];
  const [{ data: users }, { data: members }] = await Promise.all([
    supabase.from('users').select('id,email,full_name').order('email'),
    active ? supabase.from('workspace_members').select('*, user:users(email, full_name)').eq('workspace_id', active.id) : Promise.resolve({ data: [] as never[] }),
  ]);
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
      <div><div className="eyebrow">Vantage CRE</div><h1>Dashboard</h1><p className="muted">Your active Workspace is the home for its Tables, Views, Templates, and members.</p></div>
      <div className="toolbar-actions">
        {available.length > 0 && <form className="toolbar-actions" method="get"><label className="sr-only" htmlFor="workspace-select">Active Workspace</label><select id="workspace-select" name="workspace" defaultValue={active?.id}><option value="" disabled>Select Workspace</option>{available.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select><button className="btn" type="submit">Switch</button></form>}
        <DashboardWorkspaceClient mode="create" currentUserId={user.id} users={users ?? []} members={[]} />
      </div>
    </div>
    {workspaceError && <div className="alert">{workspaceError.message}</div>}
    {!active ? <section className="card empty-card"><h2>No Workspaces yet</h2><p className="muted">Create your first Workspace using the button above.</p></section> : <>
      <section className="card dashboard-card"><div className="dashboard-kicker">Active Workspace</div><h2>{active.name}</h2><p className="muted">{tableIds.filter(table => !table.is_archived).length} active Tables · {views?.length ?? 0} saved Views · {templates?.length ?? 0} Templates</p></section>
      <section className="dashboard-grid">
        <article className="card"><div className="section-head"><div><div className="section-label">Tables</div><h2>Workspace Tables</h2></div><div className="actions"><Link className="btn primary" href={`/tables/new?workspace=${active.id}`}>+ Create Table</Link><Link className="btn" href={`/tables?workspace=${active.id}`}>View all</Link></div></div>{tableIds.filter(table => !table.is_archived).map(table => <Link className="settings-row" key={table.id} href={`/tables/${table.id}`}><span><strong>{table.name}</strong><small className="muted">{table.description || 'No description yet.'}</small></span><span>Open →</span></Link>)}{tableIds.filter(table => !table.is_archived).length === 0 && <p className="muted">No Tables in this Workspace yet.</p>}</article>
        <article className="card"><div className="section-head"><div><div className="section-label">Views</div><h2>Saved Views</h2></div></div>{views?.length ? views.map(view => <Link className="settings-row" key={view.id} href={`/tables/${view.table_id}?view=${view.id}`}><span><strong>{view.name}</strong><small className="muted">{tableNames.get(view.table_id) ?? 'Table'}</small></span><span>{view.is_shared ? 'Shared' : 'Private'}</span></Link>) : <p className="muted">Save a search from a Table to see it here.</p>}</article>
      </section>
      <section className="card"><div className="section-head"><div><div className="section-label">Templates</div><h2>Shared Templates</h2></div></div>{templates?.length ? <div className="settings-list">{templates.map(template => <div className="settings-row" key={template.id}><span><strong>{template.name}</strong><small className="muted">{tableNames.get(template.table_id) ?? 'Table'}</small></span><span>{template.is_shared ? 'Shared' : 'Private'}</span></div>)}</div> : <p className="muted">Templates uploaded from Table Settings will appear here.</p>}</section>
      <DashboardWorkspaceClient mode="members" currentUserId={user.id} users={users ?? []} members={(members ?? []) as WorkspaceMember[]} workspaceId={active.id} />
    </>}
  </main>;
}
