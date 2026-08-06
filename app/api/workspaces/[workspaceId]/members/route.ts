import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Context = { params: Promise<{ workspaceId: string }> };

export async function PATCH(request: Request, context: Context) {
  const { workspaceId } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: actor } = await supabase.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).maybeSingle();
  if (actor?.role !== 'admin') return NextResponse.json({ error: 'Workspace administrator access is required.' }, { status: 403 });
  const body = await request.json();
  const userId = String(body.user_id ?? '');
  const role = String(body.role ?? '');
  if (!userId || !['viewer', 'editor', 'admin'].includes(role)) return NextResponse.json({ error: 'A member and valid role are required.' }, { status: 400 });
  const { error } = await supabase.from('workspace_members').update({ role }).eq('workspace_id', workspaceId).eq('user_id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
