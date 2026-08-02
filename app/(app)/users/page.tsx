'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { createClient } from '@/lib/supabase/client';

type User = { id: string; email: string; full_name: string; created_at: string };
const empty = { full_name: '', email: '', password: '' };

export default function UsersPage() {
  const supabase = createClient(); const [users, setUsers] = useState<User[]>([]); const [form, setForm] = useState(empty); const [editing, setEditing] = useState<string | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [pendingDelete, setPendingDelete] = useState<User | null>(null); const [deleting, setDeleting] = useState(false);
  const load = useCallback(async () => { setLoading(true); const { data, error } = await supabase.from('users').select('id,email,full_name,created_at').order('created_at'); if (error) setError(error.message); else setUsers((data ?? []) as User[]); setLoading(false); }, [supabase]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  function change(key: keyof typeof empty, value: string) { setForm(f => ({ ...f, [key]: value })); }
  function edit(user: User) { setEditing(user.id); setForm({ full_name: user.full_name, email: user.email, password: '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function reset() { setEditing(null); setForm(empty); }
  async function submit(e: FormEvent) { e.preventDefault(); setSaving(true); setError(''); const url = '/api/users'; const body = editing ? { id: editing, full_name: form.full_name, email: form.email } : form; const response = await fetch(url, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) setError(data.error ?? 'Request failed'); else { reset(); await load(); } setSaving(false); }
  function remove(id: string) { setPendingDelete(users.find(user => user.id === id) ?? null); }
  async function confirmRemove() { if (!pendingDelete) return; setDeleting(true); setError(''); const response = await fetch('/api/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: pendingDelete.id }) }); const data = await response.json(); if (!response.ok) setError(data.error ?? 'Request failed'); else { setPendingDelete(null); await load(); } setDeleting(false); }
  return <main className="container"><div className="page-head"><div><h1>Users</h1><div className="muted">Every authenticated user can manage the user directory in this POC.</div></div></div>
    {error && <div className="alert">{error}</div>}
    <section className="card" style={{marginBottom: 20}}><h2 style={{marginTop: 0}}>{editing ? 'Edit user' : 'Create user'}</h2>
      <form onSubmit={submit}><div className="form-grid"><div className="field"><label>Full name</label><input required value={form.full_name} onChange={e => change('full_name', e.target.value)} /></div><div className="field"><label>Email</label><input type="email" required value={form.email} onChange={e => change('email', e.target.value)} /></div>{!editing && <div className="field"><label>Password</label><input type="password" minLength={6} required value={form.password} onChange={e => change('password', e.target.value)} /></div>}</div><div className="actions">{editing && <button type="button" className="btn" onClick={reset}>Cancel</button>}<button className="btn primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create user'}</button></div></form>
    </section>
    <section className="card"><div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Created</th><th></th></tr></thead><tbody>{loading ? <tr><td colSpan={4}>Loading…</td></tr> : users.length === 0 ? <tr><td colSpan={4}>No users found.</td></tr> : users.map(user => <tr key={user.id}><td><strong>{user.full_name}</strong></td><td>{user.email}</td><td>{new Date(user.created_at).toLocaleString()}</td><td><div className="row-actions"><button className="btn" onClick={() => edit(user)}>Edit</button><button className="btn danger" onClick={() => remove(user.id)}>Delete</button></div></td></tr>)}</tbody></table></div></section>
    <ConfirmationDialog open={Boolean(pendingDelete)} title="Delete user?" description={pendingDelete ? `Delete ${pendingDelete.full_name} (${pendingDelete.email}) and remove their login account? This action cannot be undone.` : ''} busy={deleting} onConfirm={confirmRemove} onCancel={() => setPendingDelete(null)} />
  </main>;
}
