import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const admin = createAdminClient();
        const { data: invitations } = await admin.from('workspace_invitations').select('id,workspace_id,role').eq('status', 'pending').ilike('email', user.email).gt('expires_at', new Date().toISOString());
        for (const invitation of invitations ?? []) {
          await admin.from('workspace_members').upsert({ workspace_id: invitation.workspace_id, user_id: user.id, role: invitation.role }, { onConflict: 'workspace_id,user_id' });
          await admin.from('workspace_invitations').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', invitation.id);
        }
      }
    }
  }
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
