'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceMember, WorkspaceRole } from '@/lib/data-tables';

type DirectoryUser = { id: string; email: string; full_name: string };

type DashboardWorkspaceClientProps = {
  workspaceId?: string;
  currentUserId: string;
  members: WorkspaceMember[];
  users: DirectoryUser[];
  mode?: 'all' | 'create' | 'members';
};

export function DashboardWorkspaceClient({ workspaceId, currentUserId, members: initialMembers, users, mode = 'all' }: DashboardWorkspaceClientProps) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [createOpen, setCreateOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('viewer');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const memberIds = useMemo(() => new Set(members.map(member => member.user_id)), [members]);
  const inviteableUsers = users.filter(user => user.id !== currentUserId && !memberIds.has(user.id));

  function resetMessages() { setError(''); setNotice(''); }

  async function createWorkspace(event: FormEvent) {
    event.preventDefault();
    resetMessages();
    setBusy(true);
    try {
      const response = await fetch('/api/workspaces', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: workspaceName, user_ids: selectedUserIds }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setError(result.error ?? 'The Workspace could not be created.'); return; }
      setCreateOpen(false);
      setWorkspaceName('');
      setSelectedUserIds([]);
      router.push(`/dashboard?workspace=${result.workspace.id}`);
      router.refresh();
    } catch {
      setError('The Workspace could not be created. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function inviteMember(event: FormEvent) {
    event.preventDefault();
    if (!workspaceId) return;
    resetMessages();
    const email = inviteUserId ? users.find(user => user.id === inviteUserId)?.email : inviteEmail.trim();
    if (!email) { setError('Choose an existing user or enter an email address.'); return; }
    setBusy(true);
    const response = await fetch(`/api/workspaces/${workspaceId}/invitations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, role }) });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setError(result.error ?? 'The invitation could not be sent.'); return; }
    setNotice(result.status === 'member' ? 'Existing user added to the Workspace.' : 'Invitation sent.');
    setInviteUserId('');
    setInviteEmail('');
    await refreshMembers();
  }

  async function refreshMembers() {
    if (!workspaceId) return;
    const response = await fetch(`/api/workspaces/${workspaceId}/members`, { cache: 'no-store' });
    if (!response.ok) return;
    const result = await response.json();
    setMembers(result.members ?? []);
  }

  async function updateMember(userId: string, nextRole: string) {
    if (!workspaceId) return;
    resetMessages();
    const response = await fetch(`/api/workspaces/${workspaceId}/members`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, role: nextRole }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? 'The member role could not be updated.'); return; }
    setNotice('Member access updated.');
    await refreshMembers();
  }

  return <>
    {workspaceId && mode !== 'create' && <section className="card dashboard-card">
      <div className="section-head"><div><div className="dashboard-kicker">Workspace access</div><h2>Manage members</h2></div><span className="muted">{members.length} member{members.length === 1 ? '' : 's'}</span></div>
      <p className="muted">Invite users and set their access for the active Workspace.</p>
      {error && <div className="alert">{error}</div>}{notice && <div className="notice">{notice}</div>}
      <form className="form-grid" onSubmit={inviteMember}>
        <div className="field"><label htmlFor="dashboard-invite-user">Existing user</label><select id="dashboard-invite-user" value={inviteUserId} onChange={event => { setInviteUserId(event.target.value); if (event.target.value) setInviteEmail(''); }}><option value="">Select a user</option>{inviteableUsers.map(user => <option key={user.id} value={user.id}>{user.full_name || user.email} ({user.email})</option>)}</select></div>
        <div className="field"><label htmlFor="dashboard-invite-email">Or invite by email</label><input id="dashboard-invite-email" type="email" value={inviteEmail} onChange={event => { setInviteEmail(event.target.value); if (event.target.value) setInviteUserId(''); }} placeholder="member@example.com" /></div>
        <div className="field"><label htmlFor="dashboard-invite-role">Workspace role</label><select id="dashboard-invite-role" value={role} onChange={event => setRole(event.target.value as WorkspaceRole)}><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Administrator</option></select></div>
        <div className="actions"><button className="btn primary" disabled={busy}>Invite or add member</button></div>
      </form>
      <div className="settings-list">{members.map(member => <div className="settings-row" key={member.id}><span><strong>{member.user?.full_name || member.user?.email || member.user_id}</strong><small className="muted">{member.user?.email}</small></span>{member.user_id === currentUserId ? <span className="muted">Administrator · You</span> : <select aria-label={`Role for ${member.user?.email ?? member.user_id}`} value={member.role} onChange={event => void updateMember(member.user_id, event.target.value)}><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Administrator</option></select>}</div>)}</div>
    </section>}
    {mode !== 'members' && createOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={() => !busy && setCreateOpen(false)}><div className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="create-workspace-title" onMouseDown={event => event.stopPropagation()}><h2 id="create-workspace-title">Create Workspace</h2><p className="muted">Create a new Workspace and optionally add existing users as viewers.</p><form className="form-grid" onSubmit={createWorkspace}><div className="field"><label htmlFor="new-workspace-name">Workspace name</label><input id="new-workspace-name" autoFocus required value={workspaceName} onChange={event => setWorkspaceName(event.target.value)} placeholder="e.g. Acquisitions" /></div><div className="field"><span className="label">Invite existing users</span><div className="settings-list">{users.filter(user => user.id !== currentUserId).map(user => <label className="checkbox-field" key={user.id}><input type="checkbox" checked={selectedUserIds.includes(user.id)} onChange={event => setSelectedUserIds(current => event.target.checked ? [...current, user.id] : current.filter(id => id !== user.id))} /><span><strong>{user.full_name || user.email}</strong><small>{user.email}</small></span></label>)}</div>{users.filter(user => user.id !== currentUserId).length === 0 && <p className="muted">No other users are available yet.</p>}</div><div className="actions"><button type="button" className="btn" disabled={busy} onClick={() => setCreateOpen(false)}>Cancel</button><button className="btn primary" disabled={busy || !workspaceName.trim()}>{busy ? 'Creating…' : 'Create Workspace'}</button></div></form></div></div>}
    {mode !== 'members' && <button type="button" className="btn" aria-label="Create Workspace" title="Create Workspace" onClick={() => { resetMessages(); setCreateOpen(true); }}>+</button>}
  </>;
}
