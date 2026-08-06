import { DataTablesClient } from '@/components/data-tables-client';
export default async function NewTablePage({ searchParams }: { searchParams: Promise<{ workspace?: string }> }) {
  const { workspace } = await searchParams;
  return <DataTablesClient mode="new-table" workspaceId={workspace} />;
}
