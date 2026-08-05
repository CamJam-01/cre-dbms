"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  canAdmin,
  canCreate,
  canEdit,
  DataRowImage,
  DataTable,
  DataTableField,
  DataTableMember,
  DataTableRow,
  DocxTemplate,
  FIELD_TYPES,
  FieldType,
  keyify,
  slugify,
  TableRole,
  validateValues,
} from "@/lib/data-tables";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { csvCell, parseCsvRows } from "@/lib/comp-data-utils";

type Mode =
  "list" | "archived" | "new-table" | "table" | "record" | "edit" | "settings";
type Props = { mode: Mode; tableId?: string; rowId?: string };

const starterFields: Array<
  Pick<
    DataTableField,
    | "label"
    | "field_key"
    | "field_type"
    | "required"
    | "options"
    | "display_order"
  >
> = [
  {
    label: "Property name",
    field_key: "property_name",
    field_type: "text",
    required: true,
    options: [],
    display_order: 1,
  },
  {
    label: "Address",
    field_key: "address",
    field_type: "text",
    required: true,
    options: [],
    display_order: 2,
  },
  {
    label: "Sale date",
    field_key: "sale_date",
    field_type: "date",
    required: true,
    options: [],
    display_order: 3,
  },
  {
    label: "Sale price",
    field_key: "sale_price",
    field_type: "currency",
    required: true,
    options: [],
    display_order: 4,
  },
  {
    label: "Acreage",
    field_key: "acreage",
    field_type: "number",
    required: true,
    options: [],
    display_order: 5,
  },
  {
    label: "Seller",
    field_key: "seller",
    field_type: "text",
    required: true,
    options: [],
    display_order: 6,
  },
  {
    label: "Buyer",
    field_key: "buyer",
    field_type: "text",
    required: true,
    options: [],
    display_order: 7,
  },
  {
    label: "Notes",
    field_key: "notes",
    field_type: "long_text",
    required: false,
    options: [],
    display_order: 8,
  },
];

function useSupabase() {
  return useMemo(() => createClient(), []);
}
function formatValue(field: DataTableField, value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (field.field_type === "boolean") return value ? "Yes" : "No";
  if (field.field_type === "currency")
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Number(value));
  if (field.field_type === "multi_select" && Array.isArray(value))
    return value.join(", ");
  return String(value);
}

export function DataTablesClient({ mode, tableId, rowId }: Props) {
  const supabase = useSupabase();
  const router = useRouter();
  if (mode === "list") return <TableList supabase={supabase} />;
  if (mode === "archived") return <ArchivedTables supabase={supabase} />;
  if (mode === "new-table")
    return <NewTable supabase={supabase} router={router} />;
  if (!tableId)
    return (
      <main className="container">
        <div className="alert">A table was not specified.</div>
      </main>
    );
  if (mode === "table")
    return <TableView supabase={supabase} tableId={tableId} />;
  if (mode === "settings")
    return (
      <TableSettings supabase={supabase} router={router} tableId={tableId} />
    );
  return (
    <RecordView
      supabase={supabase}
      router={router}
      tableId={tableId}
      rowId={rowId}
      edit={mode === "edit"}
    />
  );
}

function TableList({
  supabase,
}: {
  supabase: ReturnType<typeof createClient>;
}) {
  const [tables, setTables] = useState<DataTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("data_tables")
      .select("*")
      .eq("is_archived", false)
      .order("created_at");
    if (loadError) setError(loadError.message);
    else setTables((data ?? []) as DataTable[]);
    setLoading(false);
  }, [supabase]);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);
  return (
    <main className="container">
      <div className="page-head">
        <div>
          <div className="eyebrow">Workspace</div>
          <h1>Data Tables</h1>
          <p className="muted">
            Create structured workspaces for comps, markets, and transaction
            intelligence.
          </p>
        </div>
        <div className="toolbar-actions">
          <Link className="btn" href="/data-tables/archived">
            Archived tables
          </Link>
          <Link className="btn primary" href="/data-tables/new">
            Create data table
          </Link>
        </div>
      </div>
      {error && <div className="alert">{error}</div>}
      {loading ? (
        <section className="card">Loading tables…</section>
      ) : (
        <div className="table-card-grid">
          {tables.length === 0 ? (
            <section className="card empty-card">
              <h2>No data tables yet</h2>
              <p className="muted">
                Create your first table and define the fields your records need.
              </p>
              <Link className="btn primary" href="/data-tables/new">
                Create your first table
              </Link>
            </section>
          ) : (
            tables.map((table) => (
              <Link
                className="card table-card"
                key={table.id}
                href={`/data-tables/${table.id}`}
              >
                <span className="eyebrow">Data table</span>
                <h2>{table.name}</h2>
                <p className="muted">
                  {table.description || "No description yet."}
                </p>
                <span className="table-card-link">Open table →</span>
              </Link>
            ))
          )}
        </div>
      )}
    </main>
  );
}

function ArchivedTables({
  supabase,
}: {
  supabase: ReturnType<typeof createClient>;
}) {
  const [tables, setTables] = useState<Array<DataTable & { role?: TableRole }>>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [restoring, setRestoring] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [
      { data, error: loadError },
      {
        data: { user },
      },
    ] = await Promise.all([
      supabase
        .from("data_tables")
        .select("*")
        .eq("is_archived", true)
        .order("updated_at", { ascending: false }),
      supabase.auth.getUser(),
    ]);
    if (loadError) setError(loadError.message);
    else if (data?.length && user) {
      const { data: memberData } = await supabase
        .from("data_table_members")
        .select("table_id,role")
        .in(
          "table_id",
          data.map((table) => table.id),
        )
        .eq("user_id", user.id);
      const roles = new Map(
        (memberData ?? []).map((member) => [
          member.table_id,
          member.role as TableRole,
        ]),
      );
      setTables(
        data.map((table) => ({
          ...table,
          role: table.owner_id === user.id ? "admin" : roles.get(table.id),
        })) as Array<DataTable & { role?: TableRole }>,
      );
    } else setTables((data ?? []) as Array<DataTable & { role?: TableRole }>);
    setLoading(false);
  }, [supabase]);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);
  async function restoreTable(tableId: string) {
    setRestoring(tableId);
    setError("");
    setNotice("");
    const response = await fetch(`/api/data-tables/${tableId}`, {
      method: "POST",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      setError(result.error || "The table could not be restored.");
    else {
      setNotice(
        result.slug &&
          result.slug !== tables.find((table) => table.id === tableId)?.slug
          ? `Table restored with slug ${result.slug}.`
          : "Table restored.",
      );
      await load();
    }
    setRestoring("");
  }
  return (
    <main className="container">
      <div className="page-head">
        <div>
          <div className="eyebrow">Workspace</div>
          <h1>Archived tables</h1>
          <p className="muted">
            Archived tables you own or have permission to access.
          </p>
        </div>
        <Link className="btn" href="/data-tables">
          Active tables
        </Link>
      </div>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      {loading ? (
        <section className="card">Loading archived tables…</section>
      ) : (
        <div className="table-card-grid">
          {tables.length === 0 ? (
            <section className="card empty-card">
              <h2>No archived tables</h2>
              <p className="muted">
                Archived tables will appear here when available.
              </p>
            </section>
          ) : (
            tables.map((table) => (
              <article className="card table-card" key={table.id}>
                <span className="eyebrow">
                  Archived table ·{" "}
                  {new Date(table.updated_at).toLocaleDateString()}
                </span>
                <h2>{table.name}</h2>
                <p className="muted">
                  {table.description || "No description yet."}
                </p>
                <div className="toolbar-actions">
                  <Link className="btn" href={`/data-tables/${table.id}`}>
                    View table
                  </Link>
                  {table.role === "admin" && (
                    <button
                      className="btn primary"
                      disabled={restoring === table.id}
                      onClick={() => void restoreTable(table.id)}
                    >
                      {restoring === table.id ? "Restoring…" : "Restore table"}
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </main>
  );
}

function NewTable({
  supabase,
  router,
}: {
  supabase: ReturnType<typeof createClient>;
  router: ReturnType<typeof useRouter>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState(starterFields);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  function addField() {
    setFields((current) => [
      ...current,
      {
        label: "New field",
        field_key: `field_${current.length + 1}`,
        field_type: "text" as FieldType,
        required: false,
        options: [],
        display_order: current.length + 1,
      },
    ]);
  }
  function removeField(index: number) {
    setFields((current) =>
      current
        .filter((_, fieldIndex) => fieldIndex !== index)
        .map((field, fieldIndex) => ({
          ...field,
          display_order: fieldIndex + 1,
        })),
    );
  }
  function updateField(
    index: number,
    patch: Partial<(typeof starterFields)[number]>,
  ) {
    setFields((current) =>
      current.map((field, i) =>
        i === index
          ? {
              ...field,
              ...patch,
              field_key: patch.label ? keyify(patch.label) : field.field_key,
            }
          : field,
      ),
    );
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be signed in.");
      setSaving(false);
      return;
    }
    let { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (!workspace) {
      const created = await supabase
        .from("workspaces")
        .insert({ name: "Vantage CRE Workspace", owner_id: user.id })
        .select("id")
        .single();
      workspace = created.data;
      if (created.error) {
        setError(created.error.message);
        setSaving(false);
        return;
      }
    }
    if (!workspace) {
      setError("A workspace could not be created.");
      setSaving(false);
      return;
    }
    const created = await supabase
      .from("data_tables")
      .insert({
        workspace_id: workspace.id,
        name,
        slug: slugify(name),
        description,
        owner_id: user.id,
      })
      .select()
      .single();
    if (created.error || !created.data) {
      setError(created.error?.message ?? "The table could not be created.");
      setSaving(false);
      return;
    }
    const table = created.data as DataTable;
    const member = await supabase
      .from("data_table_members")
      .insert({ table_id: table.id, user_id: user.id, role: "admin" });
    if (member.error) {
      setError(member.error.message);
      setSaving(false);
      return;
    }
    const fieldResult = await supabase
      .from("data_table_fields")
      .insert(fields.map((field) => ({ ...field, table_id: table.id })));
    if (fieldResult.error) {
      setError(fieldResult.error.message);
      setSaving(false);
      return;
    }
    router.push(`/data-tables/${table.id}`);
    router.refresh();
  }
  return (
    <main className="container">
      <div className="page-head">
        <div>
          <div className="eyebrow">New workspace</div>
          <h1>Create data table</h1>
          <p className="muted">Define the schema your records will use.</p>
        </div>
        <Link className="btn" href="/data-tables">
          Cancel
        </Link>
      </div>
      {error && <div className="alert">{error}</div>}
      <form className="card" onSubmit={submit}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="table-name">Table name</label>
            <input
              id="table-name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Industrial comps"
            />
          </div>
          <div className="field">
            <label htmlFor="table-description">Description</label>
            <input
              id="table-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What belongs in this table?"
            />
          </div>
        </div>
        <div className="section-head">
          <div>
            <div className="section-label">Initial fields</div>
            <p className="muted">
              You can refine these fields later from Table settings.
            </p>
          </div>
          <button className="btn" type="button" onClick={addField}>
            Add field
          </button>
        </div>
        <div className="field-builder">
          {fields.map((field, index) => (
            <div className="field-builder-row" key={index}>
              <input
                aria-label={`Field ${index + 1} label`}
                value={field.label}
                onChange={(event) =>
                  updateField(index, { label: event.target.value })
                }
              />
              <select
                aria-label={`Field ${index + 1} type`}
                value={field.field_type}
                onChange={(event) =>
                  updateField(index, {
                    field_type: event.target.value as FieldType,
                  })
                }
              >
                {FIELD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace("_", " ")}
                  </option>
                ))}
              </select>
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(event) =>
                    updateField(index, { required: event.target.checked })
                  }
                />{" "}
                Required
              </label>
              <button
                className="btn danger"
                type="button"
                aria-label={`Remove field ${index + 1}`}
                onClick={() => removeField(index)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="actions">
          <button className="btn primary" disabled={saving}>
            {saving ? "Creating…" : "Create data table"}
          </button>
        </div>
      </form>
    </main>
  );
}

function TableView({
  supabase,
  tableId,
}: {
  supabase: ReturnType<typeof createClient>;
  tableId: string;
}) {
  const [table, setTable] = useState<DataTable | null>(null);
  const [fields, setFields] = useState<DataTableField[]>([]);
  const [rows, setRows] = useState<DataTableRow[]>([]);
  const [role, setRole] = useState<TableRole>();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [templates, setTemplates] = useState<DocxTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    const [
      { data: tableData, error: tableError },
      { data: fieldData },
      { data: rowData },
      { data: templateData },
      {
        data: { user },
      },
    ] = await Promise.all([
      supabase.from("data_tables").select("*").eq("id", tableId).single(),
      supabase
        .from("data_table_fields")
        .select("*")
        .eq("table_id", tableId)
        .eq("is_archived", false)
        .order("display_order"),
      supabase
        .from("data_table_rows")
        .select("*, data_row_images(*)")
        .eq("table_id", tableId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("docx_templates")
        .select("*")
        .eq("table_id", tableId)
        .order("created_at"),
      supabase.auth.getUser(),
    ]);
    if (tableError) setError(tableError.message);
    setTable(tableData as DataTable);
    setFields((fieldData ?? []) as DataTableField[]);
    const normalizedRows = (rowData ?? []).map((raw) => ({
      ...raw,
      images: raw.data_row_images ?? [],
    })) as DataTableRow[];
    setRows(normalizedRows);
    setTemplates((templateData ?? []) as DocxTemplate[]);
    for (const row of normalizedRows) {
      const thumbnail =
        row.images?.find((image) => image.is_thumbnail) ?? row.images?.[0];
      if (thumbnail) {
        const { data } = await supabase.storage
          .from("comp-images")
          .createSignedUrl(thumbnail.storage_path, 3600);
        if (data?.signedUrl)
          setImageUrls((current) => ({ ...current, [row.id]: data.signedUrl }));
      }
    }
    if (user && tableData) {
      const { data: member } = await supabase
        .from("data_table_members")
        .select("role")
        .eq("table_id", tableId)
        .eq("user_id", user.id)
        .maybeSingle();
      setRole(
        (member?.role as TableRole) ??
          (tableData.owner_id === user.id ? "admin" : undefined),
      );
    }
    setLoading(false);
  }, [supabase, tableId]);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);
  const filtered = rows.filter(
    (row) =>
      !query.trim() ||
      JSON.stringify(row.values)
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  function toggleRow(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }
  async function removeRow(rowId: string) {
    const result = await supabase
      .from("data_table_rows")
      .delete()
      .eq("id", rowId);
    if (result.error) setError(result.error.message);
    else {
      setPendingDelete(null);
      setNotice("Record deleted.");
      await load();
    }
  }
  async function exportDocx() {
    if (!templateId || selected.length === 0 || exporting) return;
    setExportDialogOpen(false);
    setExporting(true);
    setError("");
    setNotice("Generating DOCX…");
    try {
      const response = await fetch("/api/exports/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, templateId, rowIds: selected }),
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "The DOCX export could not be generated.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slugify(table?.name ?? "export")}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("DOCX export downloaded.");
    } catch (exportError) {
      setNotice("");
      setError(
        exportError instanceof Error
          ? exportError.message
          : "The DOCX export could not be generated.",
      );
    } finally {
      setExporting(false);
    }
  }
  function openExportDialog() {
    if (selected.length === 0 || exporting) return;
    setError("");
    setNotice("");
    setTemplateId("");
    setExportDialogOpen(true);
  }
  if (loading)
    return (
      <main className="container">
        <section className="card">Loading table…</section>
      </main>
    );
  if (!table)
    return (
      <main className="container">
        <div className="alert">{error || "Table not found."}</div>
      </main>
    );
  return (
    <main className="container">
      <div className="page-head">
        <div>
          <div className="eyebrow">Data table</div>
          <h1>{table.name}</h1>
          <p className="muted">
            {table.description ||
              "Manage records, fields, images, and exports."}
          </p>
        </div>
        <div className="toolbar-actions">
          <Link className="btn" href="/data-tables">
            All tables
          </Link>
          {canAdmin(role) && (
            <Link className="btn" href={`/data-tables/${tableId}/settings`}>
              Table settings
            </Link>
          )}
          {canCreate(role) && (
            <Link
              className="btn primary"
              href={`/data-tables/${tableId}/records/new`}
            >
              Add record
            </Link>
          )}
        </div>
      </div>
      {error && <div className="alert">{error}</div>}
      {notice && <div className="notice">{notice}</div>}
      <section className="card">
        <div className="toolbar">
          <div className="search-field">
            <label htmlFor="table-search">Search records</label>
            <input
              id="table-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search any field…"
            />
          </div>
          <div className="toolbar-actions">
            <span className="muted">{selected.length} selected</span>
            <CompDataCsvActions
              supabase={supabase}
              tableId={tableId}
              tableName={table.name}
              fields={fields}
              rows={rows}
              filteredRows={filtered}
              canImport={canCreate(role)}
              onComplete={load}
              onError={setError}
              onNotice={setNotice}
            />
            <button
              className="btn primary"
              disabled={selected.length === 0 || exporting}
              onClick={openExportDialog}
            >
              {exporting ? "Generating…" : "Export DOCX"}
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    aria-label="Select all visible records"
                    type="checkbox"
                    checked={
                      filtered.length > 0 &&
                      filtered.every((row) => selected.includes(row.id))
                    }
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? filtered.map((row) => row.id)
                          : [],
                      )
                    }
                  />
                </th>
                {fields.map((field) => (
                  <th key={field.id}>{field.label}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={fields.length + 2}>
                    No records match this table.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        aria-label={`Select ${String(row.values[fields[0]?.field_key] ?? row.id)}`}
                        type="checkbox"
                        checked={selected.includes(row.id)}
                        onChange={() => toggleRow(row.id)}
                      />
                    </td>
                    {fields.map((field) => (
                      <td key={field.id}>
                        {field.field_type === "image" ? (
                          imageUrls[row.id] ? (
                            <img
                              className="table-thumb"
                              alt=""
                              src={imageUrls[row.id]}
                            />
                          ) : (
                            "Attached"
                          )
                        ) : (
                          formatValue(field, row.values[field.field_key])
                        )}
                      </td>
                    ))}
                    <td>
                      <div className="row-actions">
                        <Link
                          className="btn"
                          href={`/data-tables/${tableId}/records/${row.id}`}
                        >
                          View
                        </Link>
                        {canEdit(role) && (
                          <Link
                            className="btn"
                            href={`/data-tables/${tableId}/records/${row.id}/edit`}
                          >
                            Edit
                          </Link>
                        )}
                        {canCreate(role) && (
                          <button
                            className="btn danger"
                            onClick={() => setPendingDelete(row.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      {exportDialogOpen && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={() => setExportDialogOpen(false)}
        >
          <div
            className="dialog-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="export-dialog-title">Choose an export template</h2>
            <p className="muted">
              Select the Word template to use for {selected.length} selected record
              {selected.length === 1 ? "" : "s"}.
            </p>
            {templates.length > 0 ? (
              <div className="field">
                <label htmlFor="export-template">Template</label>
                <select
                  id="export-template"
                  aria-label="Export template"
                  value={templateId}
                  onChange={(event) => setTemplateId(event.target.value)}
                >
                  <option value="">Choose a template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="alert">No DOCX templates are available for this table.</p>
            )}
            <div className="actions">
              <button
                type="button"
                className="btn"
                onClick={() => setExportDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={!templateId || templates.length === 0}
                onClick={() => void exportDocx()}
              >
                Continue to export
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmationDialog
        open={Boolean(pendingDelete)}
        title="Delete record?"
        description="This record and its attached images will be permanently deleted."
        busy={false}
        onConfirm={() => (pendingDelete ? removeRow(pendingDelete) : undefined)}
        onCancel={() => setPendingDelete(null)}
      />
    </main>
  );
}

function CompDataCsvActions({
  supabase,
  tableId,
  tableName,
  fields,
  rows,
  filteredRows,
  canImport,
  onComplete,
  onError,
  onNotice,
}: {
  supabase: ReturnType<typeof createClient>;
  tableId: string;
  tableName: string;
  fields: DataTableField[];
  rows: DataTableRow[];
  filteredRows: DataTableRow[];
  canImport: boolean;
  onComplete: () => Promise<void>;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    headers: string[];
    rows: string[][];
    unmatched: string[];
  } | null>(null);
  const [selectedNewFields, setSelectedNewFields] = useState<string[]>([]);
  function exportCsv() {
    const activeFields = fields.filter((field) => !field.is_archived);
    if (!filteredRows.length || !activeFields.length) return;
    const headerRow = activeFields.map((field) => csvCell(field.label));
    const dataRows = filteredRows.map((row) => activeFields.map((field) => {
      const value = row.values[field.field_key];
      const text = Array.isArray(value) ? value.join("; ") : value === null || value === undefined ? "" : String(value);
      return csvCell(text);
    }));
    const csv = [headerRow.join(","), ...dataRows.map((row) => row.join(","))].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(tableName)}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    onNotice(
      `Exported ${filteredRows.length} record${filteredRows.length === 1 ? "" : "s"} to CSV.`,
    );
  }
  function normalizeHeader(header: string) {
    return keyify(header);
  }
  function fieldForHeader(header: string, availableFields: DataTableField[]) {
    const normalized = normalizeHeader(header);
    return availableFields.find(
      (field) =>
        field.field_key === normalized || normalizeHeader(field.label) === normalized,
    );
  }
  function csvValueForField(field: DataTableField, rawValue: string) {
    const value = rawValue.trim();
    if (!value) return field.field_type === "multi_select" ? [] : "";
    if (field.field_type === "number" || field.field_type === "currency") {
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue)) {
        throw new Error(`${field.label} must contain numeric values in the CSV.`);
      }
      return numberValue;
    }
    if (field.field_type === "boolean") {
      return ["true", "1", "yes", "y"].includes(value.toLowerCase());
    }
    if (field.field_type === "multi_select") {
      return value.split(/[;|]/).map((item) => item.trim()).filter(Boolean);
    }
    return value;
  }
  function valuesForImport(
    parsed: string[][],
    availableFields: DataTableField[],
    selectedHeaders: string[],
  ) {
    const headers = parsed[0].map((header) => header.trim());
    const mapped = new Map<string, string>();
    headers.forEach((header) => {
      const field = fieldForHeader(header, availableFields);
      if (field) mapped.set(header, field.field_key);
      else if (selectedHeaders.includes(header)) mapped.set(header, normalizeHeader(header));
    });
    return parsed.slice(1).map((row, index) => {
      if (row.length !== headers.length) {
        throw new Error(`Row ${index + 2} has ${row.length} columns, but the header has ${headers.length}.`);
      }
      const values: Record<string, unknown> = {};
      headers.forEach((header, columnIndex) => {
        const fieldKey = mapped.get(header);
        if (!fieldKey) return;
        const field = availableFields.find((item) => item.field_key === fieldKey);
        values[fieldKey] = field
          ? csvValueForField(field, row[columnIndex])
          : row[columnIndex].trim();
      });
      const validation = validateValues(availableFields, values);
      if (Object.keys(validation).length) {
        throw new Error(`Row ${index + 2}: ${Object.values(validation).join(" ")}`);
      }
      return values;
    });
  }
  function duplicateKey(values: Record<string, unknown>, includedKeys?: Set<string>) {
    return JSON.stringify(
      Object.entries(values)
        .filter(([key]) => !includedKeys || includedKeys.has(key))
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value]),
    ).toLowerCase();
  }
  async function commitImport(
    parsed: string[][],
    selectedHeaders: string[],
  ) {
    const activeFields = fields.filter((field) => !field.is_archived);
    const headers = parsed[0].map((header) => header.trim());
    const unmatched = headers.filter((header) => !fieldForHeader(header, activeFields));
    const headersToAdd = unmatched.filter((header) => selectedHeaders.includes(header));
    const createdFields: DataTableField[] = [];
    const usedKeys = new Set(activeFields.map((field) => field.field_key));
    if (headersToAdd.length) {
      const newFieldRows = headersToAdd.map((header, index) => {
        const baseKey = normalizeHeader(header);
        let fieldKey = baseKey;
        let suffix = 2;
        while (usedKeys.has(fieldKey)) fieldKey = `${baseKey}_${suffix++}`;
        usedKeys.add(fieldKey);
        return {
          table_id: tableId,
          label: header,
          field_key: fieldKey,
          field_type: "text" as FieldType,
          required: false,
          options: [],
          display_order: activeFields.length + index + 1,
        };
      });
      const fieldResult = await supabase
        .from("data_table_fields")
        .insert(newFieldRows)
        .select();
      if (fieldResult.error) throw fieldResult.error;
      createdFields.push(...((fieldResult.data ?? []) as DataTableField[]));
    }
    const effectiveFields = [...activeFields, ...createdFields];
    const values = valuesForImport(parsed, effectiveFields, headersToAdd);
    const importKeys = new Set(values.flatMap((record) => Object.keys(record)));
    const known = new Set(rows.map((row) => duplicateKey(row.values, importKeys)));
    const incoming = new Set<string>();
    const records = values.filter((record) => {
      const key = duplicateKey(record, importKeys);
      if (known.has(key) || incoming.has(key)) return false;
      incoming.add(key);
      return true;
    });
    const duplicates = values.length - records.length;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be signed in.");
    if (records.length) {
      const result = await supabase.from("data_table_rows").insert(
        records.map((record) => ({
          table_id: tableId,
          values: record,
          created_by: user.id,
          updated_by: user.id,
        })),
      );
      if (result.error) throw result.error;
    }
    await onComplete();
    setPendingImport(null);
    setSelectedNewFields([]);
    onNotice(
      `Import complete. ${records.length} record${records.length === 1 ? "" : "s"} imported${createdFields.length ? `; ${createdFields.length} field${createdFields.length === 1 ? "" : "s"} added` : ""}${duplicates ? `; ${duplicates} duplicate${duplicates === 1 ? "" : "s"} skipped` : ""}.`,
    );
  }
  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImporting(true);
    onError("");
    onNotice("");
    try {
      const parsed = parseCsvRows(await file.text());
      if (parsed.length < 2) throw new Error("The CSV must include a header row and at least one data row.");
      const headers = parsed[0].map((header) => header.trim());
      if (headers.some((header) => !header)) throw new Error("Every CSV column must have a header.");
      const activeFields = fields.filter((field) => !field.is_archived);
      const unmatched = [...new Set(headers.filter((header) => !fieldForHeader(header, activeFields)))];
      if (unmatched.length) {
        setPendingImport({ headers, rows: parsed.slice(1), unmatched });
        setSelectedNewFields(unmatched);
        setImporting(false);
        return;
      }
      await commitImport(parsed, []);
    } catch (importError) {
      onError(importError instanceof Error ? importError.message : "The CSV could not be imported.");
    } finally {
      setImporting(false);
    }
  }
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={importCsv}
        hidden
      />
      <button
        type="button"
        className="btn"
        disabled={!canImport || importing}
        onClick={() => fileInputRef.current?.click()}
      >
        {importing ? "Importing…" : "Import CSV"}
      </button>
      <button
        type="button"
        className="btn"
        disabled={filteredRows.length === 0 || fields.every((field) => field.is_archived)}
        onClick={exportCsv}
      >
        Export CSV
      </button>
      {pendingImport && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={() => !importing && setPendingImport(null)}
        >
          <div
            className="dialog-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="csv-import-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="csv-import-title">Review new CSV fields</h2>
            <p className="muted">
              These CSV columns do not match fields in this table. Select the ones to add as text fields before importing {pendingImport.rows.length} record{pendingImport.rows.length === 1 ? "" : "s"}.
            </p>
            <div className="csv-field-options">
              {pendingImport.unmatched.map((header) => (
                <label className="checkbox-field" key={header}>
                  <input
                    type="checkbox"
                    checked={selectedNewFields.includes(header)}
                    onChange={() => setSelectedNewFields((current) => current.includes(header) ? current.filter((item) => item !== header) : [...current, header])}
                  />
                  <span><strong>{header}</strong><small>New text field</small></span>
                </label>
              ))}
            </div>
            <div className="actions">
              <button type="button" className="btn" onClick={() => setPendingImport(null)} disabled={importing}>Cancel</button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  setImporting(true);
                  void commitImport([pendingImport.headers, ...pendingImport.rows], selectedNewFields).catch((importError) => onError(importError instanceof Error ? importError.message : "The CSV could not be imported.")).finally(() => setImporting(false));
                }}
                disabled={importing}
              >
                {importing ? "Importingâ€¦" : "Import selected fields"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RecordView({
  supabase,
  router,
  tableId,
  rowId,
  edit,
}: {
  supabase: ReturnType<typeof createClient>;
  router: ReturnType<typeof useRouter>;
  tableId: string;
  rowId?: string;
  edit: boolean;
}) {
  const [table, setTable] = useState<DataTable | null>(null);
  const [fields, setFields] = useState<DataTableField[]>([]);
  const [row, setRow] = useState<DataTableRow | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [role, setRole] = useState<TableRole>();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [images, setImages] = useState<DataRowImage[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const isNew = !rowId;
  useEffect(() => {
    void (async () => {
      const [{ data: tableData }, { data: fieldData }, { data: rowData }] =
        await Promise.all([
          supabase.from("data_tables").select("*").eq("id", tableId).single(),
          supabase
            .from("data_table_fields")
            .select("*")
            .eq("table_id", tableId)
            .eq("is_archived", false)
            .order("display_order"),
          rowId
            ? supabase
                .from("data_table_rows")
                .select("*, data_row_images(*)")
                .eq("id", rowId)
                .single()
            : Promise.resolve({ data: null } as { data: null }),
        ]);
      setTable(tableData as DataTable);
      setFields((fieldData ?? []) as DataTableField[]);
      if (rowData) {
        const raw = rowData as DataTableRow & {
          data_row_images?: DataRowImage[];
        };
        const typed = {
          ...raw,
          images: raw.data_row_images ?? [],
        } as DataTableRow;
        setRow(typed);
        setValues(typed.values);
        setImages((typed.images ?? []) as DataRowImage[]);
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: member } = await supabase
          .from("data_table_members")
          .select("role")
          .eq("table_id", tableId)
          .eq("user_id", user.id)
          .maybeSingle();
        setRole(
          (member?.role as TableRole) ??
            (tableData?.owner_id === user.id ? "admin" : undefined),
        );
      }
    })();
  }, [supabase, tableId, rowId]);
  function changeField(field: DataTableField, value: unknown) {
    setValues((current) => ({ ...current, [field.field_key]: value }));
  }
  async function uploadImages(savedRowId: string) {
    for (const [index, file] of files.entries()) {
      const path = `${tableId}/${savedRowId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const upload = await supabase.storage
        .from("comp-images")
        .upload(path, file);
      if (upload.error) throw upload.error;
      const insert = await supabase
        .from("data_row_images")
        .insert({
          row_id: savedRowId,
          storage_path: path,
          original_filename: file.name,
          mime_type: file.type,
          file_size: file.size,
          display_order: images.length + index,
          is_thumbnail: images.length === 0 && index === 0,
        });
      if (insert.error) throw insert.error;
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const validation = validateValues(fields, values);
    if (Object.keys(validation).length) {
      setError(Object.values(validation).join(" "));
      return;
    }
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in.");
      const result = isNew
        ? await supabase
            .from("data_table_rows")
            .insert({
              table_id: tableId,
              values,
              created_by: user.id,
              updated_by: user.id,
            })
            .select()
            .single()
        : await supabase
            .from("data_table_rows")
            .update({ values, updated_by: user.id })
            .eq("id", rowId)
            .select()
            .single();
      if (result.error || !result.data)
        throw result.error ?? new Error("The record could not be saved.");
      await uploadImages(result.data.id);
      router.push(`/data-tables/${tableId}/records/${result.data.id}`);
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The record could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function loadImage(id: string, path: string) {
    const { data } = await supabase.storage
      .from("comp-images")
      .createSignedUrl(path, 3600);
    if (data?.signedUrl)
      setImageUrls((current) => ({ ...current, [id]: data.signedUrl }));
  }
  async function setThumbnail(image: DataRowImage) {
    const rowImages = images.map((item) => ({
      id: item.id,
      is_thumbnail: item.id === image.id,
    }));
    const result = await Promise.all(
      rowImages.map((item) =>
        supabase
          .from("data_row_images")
          .update({ is_thumbnail: item.is_thumbnail })
          .eq("id", item.id),
      ),
    );
    if (result.some((item) => item.error))
      setError("The thumbnail could not be updated.");
    else
      setImages((current) =>
        current.map((item) => ({
          ...item,
          is_thumbnail: item.id === image.id,
        })),
      );
  }
  async function removeImage(image: DataRowImage) {
    const storageResult = await supabase.storage
      .from("comp-images")
      .remove([image.storage_path]);
    const dbResult = await supabase
      .from("data_row_images")
      .delete()
      .eq("id", image.id);
    if (storageResult.error || dbResult.error)
      setError(
        storageResult.error?.message ??
          dbResult.error?.message ??
          "The image could not be removed.",
      );
    else setImages((current) => current.filter((item) => item.id !== image.id));
  }
  async function moveImage(image: DataRowImage, direction: -1 | 1) {
    const index = images.findIndex((item) => item.id === image.id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= images.length) return;
    const ordered = [...images];
    [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];
    const result = await Promise.all(
      ordered.map((item, itemIndex) =>
        supabase
          .from("data_row_images")
          .update({ display_order: itemIndex })
          .eq("id", item.id),
      ),
    );
    if (result.some((item) => item.error))
      setError("The image order could not be updated.");
    else
      setImages(
        ordered.map((item, itemIndex) => ({
          ...item,
          display_order: itemIndex,
        })),
      );
  }
  useEffect(() => {
    images.forEach((image) => {
      void loadImage(image.id, image.storage_path);
    });
  }, [images, supabase]);
  if (!table)
    return (
      <main className="container">
        <section className="card">Loading record…</section>
      </main>
    );
  const canWrite = isNew ? canCreate(role) : canEdit(role);
  if (!isNew && !row)
    return (
      <main className="container">
        <div className="alert">Record not found.</div>
      </main>
    );
  const imagePanel =
    images.length > 0 ? (
      <div className="detail-images">
        <span className="section-label">Images</span>
        <div className="image-grid">
          {images.map((image, index) => (
            <div className="image-tile" key={image.id}>
              {imageUrls[image.id] && (
                <img src={imageUrls[image.id]} alt={image.original_filename} />
              )}
              <span>
                {image.original_filename}
                {image.is_thumbnail ? " · Thumbnail" : ""}
              </span>
              {edit && (
                <div className="image-actions">
                  <button
                    className="btn"
                    type="button"
                    onClick={() => void setThumbnail(image)}
                  >
                    {image.is_thumbnail
                      ? "Thumbnail selected"
                      : "Use thumbnail"}
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => void moveImage(image, -1)}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => void moveImage(image, 1)}
                    disabled={index === images.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    className="btn danger"
                    type="button"
                    onClick={() => void removeImage(image)}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    ) : null;
  return (
    <main className="container">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            {isNew ? "New record" : edit ? "Edit record" : "Record detail"}
          </div>
          <h1>
            {isNew
              ? "Add record"
              : String(row?.values[fields[0]?.field_key] ?? "Record")}
          </h1>
          <p className="muted">
            {isNew
              ? "Enter values for this table."
              : edit
                ? "Update the record and its attachments."
                : "Review the saved values and attached media."}
          </p>
        </div>
        <div className="toolbar-actions">
          <Link className="btn" href={`/data-tables/${tableId}`}>
            Back to table
          </Link>
          {!isNew && !edit && canWrite && (
            <Link
              className="btn primary"
              href={`/data-tables/${tableId}/records/${rowId}/edit`}
            >
              Edit record
            </Link>
          )}
        </div>
      </div>
      {error && <div className="alert">{error}</div>}
      {edit || isNew ? (
        canWrite ? (
          <form className="card" onSubmit={submit}>
            <div className="form-grid">
              {fields.map((field) => (
                <DynamicField
                  key={field.id}
                  field={field}
                  value={values[field.field_key]}
                  onChange={(value) => changeField(field, value)}
                />
              ))}
            </div>
            {imagePanel}
            <div className="field full" style={{ marginTop: 18 }}>
              <label htmlFor="record-images">Attach images</label>
              <input
                id="record-images"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setFiles(Array.from(event.target.files ?? []).slice(0, 20))
                }
              />
              <span className="field-help">
                JPEG, PNG, or WebP. Up to 10 MB each and 20 images per record.
              </span>
              {files.length > 0 && (
                <span className="muted">
                  {files.length} image(s) ready to upload.
                </span>
              )}
            </div>
            <div className="actions">
              <Link
                className="btn"
                href={
                  isNew
                    ? `/data-tables/${tableId}`
                    : `/data-tables/${tableId}/records/${rowId}`
                }
              >
                Cancel
              </Link>
              <button className="btn primary" disabled={saving}>
                {saving ? "Saving…" : "Save record"}
              </button>
            </div>
          </form>
        ) : (
          <div className="alert">
            You do not have permission to edit this record.
          </div>
        )
      ) : (
        <section className="card detail-grid">
          {fields.map((field) => (
            <div className="detail-item" key={field.id}>
              <span className="section-label">{field.label}</span>
              <strong>{formatValue(field, values[field.field_key])}</strong>
            </div>
          ))}
          {imagePanel}
        </section>
      )}
    </main>
  );
}

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: DataTableField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.field_type === "long_text")
    return (
      <div className="field full">
        <label htmlFor={field.field_key}>
          {field.label}
          {field.required ? " *" : ""}
        </label>
        <textarea
          id={field.field_key}
          rows={4}
          required={field.required}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
  if (field.field_type === "boolean")
    return (
      <label className="checkbox-field">
        <input
          id={field.field_key}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>
          <strong>{field.label}</strong>
          <small>{field.required ? "Required" : "Optional"}</small>
        </span>
      </label>
    );
  if (field.field_type === "single_select")
    return (
      <div className="field">
        <label htmlFor={field.field_key}>
          {field.label}
          {field.required ? " *" : ""}
        </label>
        <select
          id={field.field_key}
          required={field.required}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select…</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  if (field.field_type === "multi_select")
    return (
      <div className="field">
        <label htmlFor={field.field_key}>{field.label}</label>
        <select
          id={field.field_key}
          multiple
          value={Array.isArray(value) ? value.map(String) : []}
          onChange={(event) =>
            onChange(
              Array.from(event.target.selectedOptions).map(
                (option) => option.value,
              ),
            )
          }
        >
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  if (field.field_type === "image")
    return (
      <div className="field">
        <label>{field.label}</label>
        <span className="field-help">Use the record image uploader below.</span>
      </div>
    );
  return (
    <div className="field">
      <label htmlFor={field.field_key}>
        {field.label}
        {field.required ? " *" : ""}
      </label>
      <input
        id={field.field_key}
        required={field.required}
        type={
          field.field_type === "date"
            ? "date"
            : field.field_type === "number" || field.field_type === "currency"
              ? "number"
              : "text"
        }
        step={
          field.field_type === "currency"
            ? "0.01"
            : field.field_type === "number"
              ? "0.0001"
              : undefined
        }
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function TableSettings({
  supabase,
  router,
  tableId,
}: {
  supabase: ReturnType<typeof createClient>;
  router: ReturnType<typeof useRouter>;
  tableId: string;
}) {
  const [table, setTable] = useState<DataTable | null>(null);
  const [fields, setFields] = useState<DataTableField[]>([]);
  const [users, setUsers] = useState<
    Array<{ id: string; email: string; full_name: string }>
  >([]);
  const [members, setMembers] = useState<DataTableMember[]>([]);
  const [templates, setTemplates] = useState<DocxTemplate[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newOption, setNewOption] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [pendingFieldDelete, setPendingFieldDelete] =
    useState<DataTableField | null>(null);
  const load = useCallback(async () => {
    const [
      { data: tableData },
      { data: fieldData },
      { data: memberData },
      { data: userData },
      { data: templateData },
    ] = await Promise.all([
      supabase.from("data_tables").select("*").eq("id", tableId).single(),
      supabase
        .from("data_table_fields")
        .select("*")
        .eq("table_id", tableId)
        .order("display_order"),
      supabase
        .from("data_table_members")
        .select("*, user:users(email, full_name)")
        .eq("table_id", tableId),
      supabase.from("users").select("id,email,full_name").order("email"),
      supabase
        .from("docx_templates")
        .select("*")
        .eq("table_id", tableId)
        .order("created_at"),
    ]);
    setTable(tableData as DataTable);
    setFields((fieldData ?? []) as DataTableField[]);
    setMembers((memberData ?? []) as DataTableMember[]);
    setUsers(
      (userData ?? []) as Array<{
        id: string;
        email: string;
        full_name: string;
      }>,
    );
    setTemplates((templateData ?? []) as DocxTemplate[]);
  }, [supabase, tableId]);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);
  async function saveField(field: DataTableField) {
    setError("");
    const savedField = { ...field, field_key: keyify(field.label) };
    const { error: saveError } = await supabase
      .from("data_table_fields")
      .update({
        label: savedField.label,
        field_key: savedField.field_key,
        field_type: savedField.field_type,
        required: savedField.required,
        options: savedField.options,
        display_order: savedField.display_order,
        is_archived: savedField.is_archived,
      })
      .eq("id", field.id);
    if (saveError) setError(saveError.message);
    else {
      setFields((current) =>
        current.map((item) => (item.id === field.id ? savedField : item)),
      );
      setNotice(
        savedField.is_archived
          ? "Field archived."
          : field.is_archived
            ? "Field restored."
            : "Field saved.",
      );
    }
  }
  async function addField() {
    if (!table) return;
    const index = fields.length + 1;
    const result = await supabase
      .from("data_table_fields")
      .insert({
        table_id: table.id,
        label: `New field ${index}`,
        field_key: `new_field_${index}`,
        field_type: "text",
        required: false,
        options: [],
        display_order: index,
      })
      .select()
      .single();
    if (result.error) setError(result.error.message);
    else setFields((current) => [...current, result.data as DataTableField]);
  }
  async function deleteField() {
    if (!pendingFieldDelete) return;
    const field = pendingFieldDelete;
    setPendingFieldDelete(null);
    setError("");
    const result = await supabase
      .from("data_table_fields")
      .delete()
      .eq("id", field.id);
    if (result.error) setError(result.error.message);
    else {
      setFields((current) => current.filter((item) => item.id !== field.id));
      setNotice(`Field “${field.label}” deleted.`);
    }
  }
  async function addMember(event: ChangeEvent<HTMLSelectElement>) {
    if (!event.target.value) return;
    const result = await supabase
      .from("data_table_members")
      .upsert(
        { table_id: tableId, user_id: event.target.value, role: "viewer" },
        { onConflict: "table_id,user_id" },
      )
      .select("*, user:users(email, full_name)")
      .single();
    if (result.error) setError(result.error.message);
    else {
      setMembers((current) => [
        ...current.filter((member) => member.user_id !== event.target.value),
        result.data as DataTableMember,
      ]);
      setNotice("User added as viewer.");
    }
    event.target.value = "";
  }
  async function updateMember(member: DataTableMember, role: TableRole) {
    const result = await supabase
      .from("data_table_members")
      .update({ role })
      .eq("id", member.id);
    if (result.error) setError(result.error.message);
    else
      setMembers((current) =>
        current.map((item) =>
          item.id === member.id ? { ...item, role } : item,
        ),
      );
  }
  async function uploadTemplate(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (
      !file ||
      file.type !==
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      setError("Choose a .docx template.");
      return;
    }
    const path = `${tableId}/${crypto.randomUUID()}.docx`;
    const upload = await supabase.storage
      .from("docx-templates")
      .upload(path, file);
    if (upload.error) {
      setError(upload.error.message);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const result = await supabase
      .from("docx_templates")
      .insert({
        table_id: tableId,
        name: file.name.replace(/\.docx$/i, ""),
        storage_path: path,
        uploaded_by: user?.id,
        supported_fields: [],
      })
      .select()
      .single();
    if (result.error) setError(result.error.message);
    else {
      setTemplates((current) => [...current, result.data as DocxTemplate]);
      setNotice(
        "Template uploaded. Use {{field_key}} placeholders in the DOCX.",
      );
    }
  }
  if (!table)
    return (
      <main className="container">
        <section className="card">Loading settings…</section>
      </main>
    );
  async function deleteTable() {
    setDeleting(true);
    setPendingDelete(false);
    setError("");
    setNotice("Deleting table…");
    const response = await fetch(`/api/data-tables/${tableId}`, {
      method: "DELETE",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setDeleting(false);
      setNotice("");
      setError(result.error || "The table could not be deleted.");
      return;
    }
    router.push("/data-tables");
    router.refresh();
  }
  return (
    <main className="container">
      <div className="page-head">
        <div>
          <div className="eyebrow">Data validation</div>
          <h1>{table.name} settings</h1>
          <p className="muted">
            Define fields, options, members, and DOCX templates.
          </p>
        </div>
        <div className="toolbar-actions">
          <Link className="btn" href={`/data-tables/${tableId}`}>
            Back to table
          </Link>
          <button
            className="btn danger"
            disabled={deleting}
            onClick={async () => {
              setError("");
              const result = await supabase
                .from("data_tables")
                .update({ is_archived: true })
                .eq("id", tableId);
              if (result.error) setError(result.error.message);
              else {
                setNotice("Table archived.");
                router.push("/data-tables");
                router.refresh();
              }
            }}
          >
            {deleting ? "Working…" : "Archive table"}
          </button>
          <button
            className="btn danger solid"
            disabled={deleting}
            onClick={() => setPendingDelete(true)}
          >
            {deleting ? "Deleting…" : "Delete table"}
          </button>
        </div>
      </div>
      {error && <div className="alert">{error}</div>}
      {notice && <div className="notice">{notice}</div>}
      <section className="card">
        <div className="section-head">
          <div>
            <div className="section-label">Fields and validation</div>
            <p className="muted">
              Archived fields preserve existing row values.
            </p>
          </div>
          <button className="btn" onClick={addField}>
            Add field
          </button>
        </div>
        <div className="settings-list">
          {fields.map((field) => (
            <div
              className={`settings-row${field.is_archived ? " archived-row" : ""}`}
              key={field.id}
            >
              <input
                aria-label={`${field.label} label`}
                value={field.label}
                onChange={(event) =>
                  setFields((current) =>
                    current.map((item) =>
                      item.id === field.id
                        ? { ...item, label: event.target.value }
                        : item,
                    ),
                  )
                }
              />
              <select
                aria-label={`${field.label} type`}
                value={field.field_type}
                onChange={(event) =>
                  setFields((current) =>
                    current.map((item) =>
                      item.id === field.id
                        ? {
                            ...item,
                            field_type: event.target.value as FieldType,
                          }
                        : item,
                    ),
                  )
                }
              >
                {FIELD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace("_", " ")}
                  </option>
                ))}
              </select>
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(event) =>
                    setFields((current) =>
                      current.map((item) =>
                        item.id === field.id
                          ? { ...item, required: event.target.checked }
                          : item,
                      ),
                    )
                  }
                />{" "}
                Required
              </label>
              <button className="btn" onClick={() => saveField(field)}>
                Save
              </button>
              <button
                className="btn"
                onClick={() =>
                  saveField({ ...field, is_archived: !field.is_archived })
                }
              >
                {field.is_archived ? "Restore" : "Archive"}
              </button>
              <button
                className="btn danger"
                type="button"
                onClick={() => setPendingFieldDelete(field)}
              >
                Delete
              </button>
              {["single_select", "multi_select"].includes(field.field_type) && (
                <div className="option-editor">
                  <span className="section-label">Options</span>
                  <div>
                    {field.options.map((option) => (
                      <span className="option-chip" key={option}>
                        {option}
                      </span>
                    ))}
                  </div>
                  <input
                    placeholder="Add option"
                    value={newOption[field.id] ?? ""}
                    onChange={(event) =>
                      setNewOption((current) => ({
                        ...current,
                        [field.id]: event.target.value,
                      }))
                    }
                  />
                  <button
                    className="btn"
                    onClick={() => {
                      const option = newOption[field.id]?.trim();
                      if (!option) return;
                      setFields((current) =>
                        current.map((item) =>
                          item.id === field.id
                            ? { ...item, options: [...item.options, option] }
                            : item,
                        ),
                      );
                      setNewOption((current) => ({
                        ...current,
                        [field.id]: "",
                      }));
                    }}
                  >
                    Add option
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <div className="section-label">Table access</div>
        <p className="muted">
          Add an existing user and choose their data-table permissions.
        </p>
        <select
          aria-label="Add table member"
          defaultValue=""
          onChange={addMember}
        >
          <option value="">Add user…</option>
          {users
            .filter(
              (user) => !members.some((member) => member.user_id === user.id),
            )
            .map((user) => (
              <option key={user.id} value={user.id}>
                {user.email}
              </option>
            ))}
        </select>
        <div className="settings-list">
          {members.map((member) => (
            <div className="settings-row" key={member.id}>
              <span>
                {member.user?.full_name || member.user?.email || member.user_id}
              </span>
              <select
                value={member.role}
                onChange={(event) =>
                  updateMember(member, event.target.value as TableRole)
                }
              >
                <option value="viewer">Read-only</option>
                <option value="editor">Read & update</option>
                <option value="operator">Full CRUD</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <div className="section-label">DOCX templates</div>
        <p className="muted">
          Upload a Word template using merge fields like{" "}
          <code>{"{{property_name}}"}</code>.
        </p>
        <input
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={uploadTemplate}
        />
        <div className="settings-list">
          {templates.map((template) => (
            <div className="settings-row" key={template.id}>
              <span>{template.name}</span>
              <span className="muted">
                Uploaded {new Date(template.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </section>
      <ConfirmationDialog
        open={pendingDelete}
        title="Delete table?"
        description="This permanently deletes the table, its records, fields, memberships, images, and templates."
        busy={deleting}
        onConfirm={deleteTable}
        onCancel={() => setPendingDelete(false)}
      />
      <ConfirmationDialog
        open={Boolean(pendingFieldDelete)}
        title="Delete field?"
        description={
          pendingFieldDelete
            ? `Delete “${pendingFieldDelete.label}” from this table? Existing record values for this field will be preserved in historical JSON.`
            : ""
        }
        busy={false}
        onConfirm={deleteField}
        onCancel={() => setPendingFieldDelete(null)}
      />
    </main>
  );
}

export function RouteParamsClient({ mode }: { mode: Mode }) {
  const params = useParams<{ tableId?: string; rowId?: string }>();
  return (
    <DataTablesClient
      mode={mode}
      tableId={params.tableId}
      rowId={params.rowId}
    />
  );
}
