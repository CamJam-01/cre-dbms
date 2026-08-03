import { DataTablesClient } from '@/components/data-tables-client';
export default async function DataTableSettingsPage({ params }: { params: Promise<{ tableId: string }> }) { const { tableId } = await params; return <DataTablesClient mode="settings" tableId={tableId} />; }
