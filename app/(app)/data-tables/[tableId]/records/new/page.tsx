import { DataTablesClient } from '@/components/data-tables-client';
export default async function NewRecordPage({ params }: { params: Promise<{ tableId: string }> }) { const { tableId } = await params; return <DataTablesClient mode="record" tableId={tableId} />; }
