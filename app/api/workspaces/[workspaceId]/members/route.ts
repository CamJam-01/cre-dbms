import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type Context = { params: Promise<{ workspaceId: string }> };

export async function PATCH(request: Request, context: Context) {
  const { workspaceId } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: workspace } = await supabase.from('workspaces').select('owner_id').eq('id', workspaceId).maybeSingle();
  const { data: actor } = await supabase.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).maybeSingle();
  if (workspace?.owner_id !== user.id && actor?.role !== 'admin') return NextResponse.json({ error: 'Workspace administrator access is required.' }, { status: 403 });
  const body = await request.json();
  const userId = String(body.user_id ?? '');
  const role = String(body.role ?? '');
  if (!userId || !['viewer', 'editor', 'admin'].includes(role)) return NextResponse.json({ error: 'A member and valid role are required.' }, { status: 400 });
  const { error } = await supabase.from('workspace_members').update({ role }).eq('workspace_id', workspaceId).eq('user_id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: Context) {
  const { workspaceId } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: workspace } = await supabase.from('workspaces').select('owner_id').eq('id', workspaceId).maybeSingle();
  const { data: actor } = await supabase.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).maybeSingle();
  if (workspace?.owner_id !== user.id && actor?.role !== 'admin') return NextResponse.json({ error: 'Workspace administrator access is required.' }, { status: 403 });
  const body = await request.json();
  const userId = String(body.user_id ?? '');
  if (!userId) return NextResponse.json({ error: 'A member is required.' }, { status: 400 });
  if (userId === workspace?.owner_id) return NextResponse.json({ error: 'The Workspace owner cannot be removed.' }, { status: 400 });
  if (userId === user.id) return NextResponse.json({ error: 'You cannot remove your own access.' }, { status: 400 });
  const { error } = await createAdminClient().from('workspace_members').delete().eq('workspace_id', workspaceId).eq('user_id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request, context: Context) {
  const { workspaceId } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: members, error } = await supabase.from('workspace_members').select('*, user:users(email, full_name)').eq('workspace_id', workspaceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ members: members ?? [] });
}
