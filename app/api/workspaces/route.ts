import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const name = String(body.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'A Workspace name is required.' }, { status: 400 });
  if (name.length > 120) return NextResponse.json({ error: 'Workspace names must be 120 characters or fewer.' }, { status: 400 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Workspace creation is not configured on this server. Add SUPABASE_SERVICE_ROLE_KEY to the server environment.' }, { status: 503 });
  }
  const admin = createAdminClient();
  // The owner has to create both the Workspace and its first membership in one
  // server-side operation. The public RLS policy currently rejects the initial
  // Workspace insert before the owner membership exists, so keep the user
  // authentication check above and perform this setup through the server-only
  // admin client.
  const { data: workspace, error: workspaceError } = await admin
    .from('workspaces')
    .insert({ name, owner_id: user.id })
    .select('id,name')
    .single();
  if (workspaceError || !workspace) return NextResponse.json({ error: workspaceError?.message ?? 'The Workspace could not be created.' }, { status: 400 });

  const { error: memberError } = await admin.from('workspace_members').upsert(
    { workspace_id: workspace.id, user_id: user.id, role: 'admin' },
    { onConflict: 'workspace_id,user_id' },
  );
  if (memberError) {
    await admin.from('workspaces').delete().eq('id', workspace.id);
    return NextResponse.json({ error: memberError.message }, { status: 400 });
  }

  return NextResponse.json({ workspace });
}
