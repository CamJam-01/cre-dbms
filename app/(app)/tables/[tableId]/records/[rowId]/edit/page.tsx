import { DataTablesClient } from '@/components/data-tables-client';
export default async function EditRecordPage({ params }: { params: Promise<{ tableId: string; rowId: string }> }) { const { tableId, rowId } = await params; return <DataTablesClient mode="edit" tableId={tableId} rowId={rowId} />; }
