import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function WorkspacePage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const [{ data: workspace }, { data: tables }, { data: views }, { data: members }] = await Promise.all([
    supabase.from('workspaces').select('*').eq('id', workspaceId).single(),
    supabase.from('data_tables').select('*').eq('workspace_id', workspaceId).order('created_at'),
    supabase.from('saved_views').select('*').eq('workspace_id', workspaceId).order('updated_at', { ascending: false }),
    supabase.from('workspace_members').select('*, user:users(email, full_name)').eq('workspace_id', workspaceId),
  ]);
  if (!workspace) return <main className="container"><div className="alert">Workspace not found.</div></main>;
  return <main className="container"><div className="page-head"><div><div className="eyebrow">Workspace</div><h1>{workspace.name}</h1><p className="muted">Tables, saved Views, shared Templates, and Workspace members.</p></div><div className="toolbar-actions"><Link className="btn" href="/dashboard">Dashboard</Link><Link className="btn" href={`/workspaces/${workspaceId}/settings`}>Workspace settings</Link><Link className="btn primary" href="/tables/new">Create Table</Link></div></div>
    <section className="card"><div className="section-head"><div><div className="section-label">Tables</div><h2>Workspace Tables</h2></div></div><div className="table-card-grid">{(tables ?? []).filter(table => !table.is_archived).map(table => <Link className="card table-card" key={table.id} href={`/tables/${table.id}`}><span className="eyebrow">Table</span><h2>{table.name}</h2><p className="muted">{table.description || 'No description yet.'}</p><span className="table-card-link">Open table →</span></Link>)}</div></section>
    <section className="dashboard-grid"><article className="card"><div className="section-label">Views</div><h2>Saved Views</h2>{views?.length ? views.map(view => <Link className="settings-row" key={view.id} href={`/tables/${view.table_id}?view=${view.id}`}><span><strong>{view.name}</strong><small className="muted">{view.is_shared ? 'Shared' : 'Private'}</small></span><span>Open →</span></Link>) : <p className="muted">No saved Views yet.</p>}</article><article className="card"><div className="section-label">Members</div><h2>{members?.length ?? 0} members</h2><p className="muted">Manage Workspace access from settings.</p><Link className="btn" href={`/workspaces/${workspaceId}/settings`}>Manage members</Link></article></section>
  </main>;
}
