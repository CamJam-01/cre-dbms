import { WorkspaceRole } from '@/lib/data-tables';

export async function getTableWorkspaceRole(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>,
  tableId: string,
): Promise<WorkspaceRole | undefined> {
  const [{ data: userData }, { data: table }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('data_tables').select('workspace_id, owner_id').eq('id', tableId).maybeSingle(),
  ]);
  if (!userData.user || !table) return undefined;
  if (table.owner_id === userData.user.id) return 'admin';
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', table.workspace_id)
    .eq('user_id', userData.user.id)
    .maybeSingle();
  return member?.role as WorkspaceRole | undefined;
}
