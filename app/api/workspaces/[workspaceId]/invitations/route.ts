import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type Context = { params: Promise<{ workspaceId: string }> };

async function authorize(workspaceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: member } = await supabase.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).maybeSingle();
  if (member?.role !== 'admin') return { response: NextResponse.json({ error: 'Workspace administrator access is required.' }, { status: 403 }) };
  return { supabase, user };
}

export async function POST(request: Request, context: Context) {
  const { workspaceId } = await context.params;
  const authorized = await authorize(workspaceId);
  if ('response' in authorized) return authorized.response;
  const body = await request.json();
  const email = String(body.email ?? '').trim().toLowerCase();
  const role = ['viewer', 'editor', 'admin'].includes(body.role) ? body.role : 'viewer';
  if (!email || !email.includes('@')) return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });

  const { data: existing } = await authorized.supabase.from('users').select('id,email').eq('email', email).maybeSingle();
  if (existing) {
    const { error } = await authorized.supabase.from('workspace_members').upsert({ workspace_id: workspaceId, user_id: existing.id, role }, { onConflict: 'workspace_id,user_id' });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ status: 'member', email });
  }

  const { data: invitation, error: invitationError } = await authorized.supabase.from('workspace_invitations').insert({ workspace_id: workspaceId, email, role, invited_by: authorized.user.id }).select().single();
  if (invitationError) return NextResponse.json({ error: invitationError.message }, { status: 400 });
  const admin = createAdminClient();
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { data: { workspace_id: workspaceId, invitation_id: invitation.id }, redirectTo: new URL('/auth/callback', request.url).toString() });
  if (inviteError) {
    await authorized.supabase.from('workspace_invitations').update({ status: 'revoked' }).eq('id', invitation.id);
    return NextResponse.json({ error: inviteError.message }, { status: 400 });
  }
  return NextResponse.json({ status: 'invited', invitation });
}
