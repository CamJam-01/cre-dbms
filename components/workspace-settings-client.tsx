'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { WorkspaceMember, WorkspaceRole } from '@/lib/data-tables';

export function WorkspaceSettingsClient({ workspaceId }: { workspaceId: string }) {
  const supabase = createClient();
  const [workspace, setWorkspace] = useState<{ name: string } | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('viewer');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const readWorkspace = useCallback(async () => {
    const [{ data: workspaceData }, { data: memberData }] = await Promise.all([
      supabase.from('workspaces').select('name').eq('id', workspaceId).single(),
      supabase.from('workspace_members').select('*, user:users(email, full_name)').eq('workspace_id', workspaceId),
    ]);
    return { workspaceData, memberData: (memberData ?? []) as WorkspaceMember[] };
  }, [supabase, workspaceId]);
  async function load() { const result = await readWorkspace(); setWorkspace(result.workspaceData); setMembers(result.memberData); }
  useEffect(() => { let cancelled = false; void readWorkspace().then(result => { if (!cancelled) { setWorkspace(result.workspaceData); setMembers(result.memberData); } }); return () => { cancelled = true; }; }, [readWorkspace]);
  async function invite(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice('');
    const response = await fetch(`/api/workspaces/${workspaceId}/invitations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, role }) });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? 'The invitation could not be sent.'); else { setNotice(result.status === 'member' ? 'Existing user added to the Workspace.' : 'Invitation sent.'); setEmail(''); await load(); }
  }
  async function updateMember(event: ChangeEvent<HTMLSelectElement>, userId: string) {
    const response = await fetch(`/api/workspaces/${workspaceId}/members`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, role: event.target.value }) });
    const result = await response.json(); if (!response.ok) setError(result.error ?? 'The member role could not be updated.'); else { setNotice('Member access updated.'); await load(); }
  }
  return <main className="container"><div className="page-head"><div><div className="eyebrow">Workspace settings</div><h1>{workspace?.name ?? 'Workspace'}</h1><p className="muted">Invite members and set their Workspace access.</p></div><Link className="btn" href={`/workspaces/${workspaceId}`}>Back to Workspace</Link></div>{error && <div className="alert">{error}</div>}{notice && <div className="notice">{notice}</div>}<section className="card"><div className="section-label">Invite member</div><form className="form-grid" onSubmit={invite}><div className="field"><label htmlFor="member-email">Email</label><input id="member-email" type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="member@example.com" /></div><div className="field"><label htmlFor="member-role">Workspace role</label><select id="member-role" value={role} onChange={event => setRole(event.target.value as WorkspaceRole)}><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Administrator</option></select></div><div className="actions"><button className="btn primary">Invite or add member</button></div></form></section><section className="card"><div className="section-label">Members</div><div className="settings-list">{members.map(member => <div className="settings-row" key={member.id}><span><strong>{member.user?.full_name || member.user?.email || member.user_id}</strong><small className="muted">{member.user?.email}</small></span><select value={member.role} onChange={event => updateMember(event, member.user_id)}><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Administrator</option></select></div>)}</div></section></main>;
}
