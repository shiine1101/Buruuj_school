"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Inbox, Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";

type Row = Record<string, string | number>;

type DataTableProps = {
  rows: Row[];
  onEdit?: (index: number, row: Row) => void;
  onDelete?: (index: number) => void;
  deleteLabel?: string;
};

export function DataTable({ rows, onEdit, onDelete, deleteLabel = "Delete" }: DataTableProps) {
  const headers = rows.length ? Object.keys(rows[0]).filter((k) => k !== "id") : [];
  const hasActions = onEdit || onDelete;
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const visibleRows = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [page, rows]);

  useEffect(() => {
    setPage((value) => Math.min(value, pageCount));
  }, [pageCount]);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-slate-50/70 py-16 text-center dark:bg-slate-900/40">
        <div className="mb-3 grid h-12 w-12 place-items-center rounded-md bg-white text-blue-600 shadow-sm dark:bg-slate-900">
          <Inbox className="h-6 w-6" />
        </div>
        <p className="font-semibold text-slate-700 dark:text-slate-200">No records found</p>
        <p className="mt-1 text-sm text-slate-500">Adjust filters or add a new record to continue.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-slate-900">
        <div className="max-h-[620px] overflow-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase text-slate-500 shadow-[0_1px_0_hsl(var(--border))] dark:bg-slate-900 dark:text-slate-400">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 font-bold">{h.replace(/([A-Z])/g, " $1").trim()}</th>
                ))}
                {hasActions && <th className="whitespace-nowrap px-4 py-3 text-right font-bold">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {visibleRows.map((row, index) => {
                const rowIndex = (page - 1) * pageSize + index;
                return (
                  <tr key={rowIndex} className="bg-white transition-colors hover:bg-blue-50/40 dark:bg-slate-900 dark:hover:bg-slate-800/70">
                    {headers.map((header) => {
                      const value = row[header];
                      const isStatus = header.toLowerCase().includes("status") || value === "Allowed" || value === "Blocked";
                      return (
                        <td key={header} className="px-4 py-3.5">
                          {isStatus ? <Badge className={statusClass(String(value))}>{value}</Badge> : <span className="font-medium text-slate-800 dark:text-slate-200">{value}</span>}
                        </td>
                      );
                    })}
                    {hasActions && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {onEdit && (
                            <button onClick={() => onEdit(rowIndex, row)} className="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900">
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                          )}
                          {onDelete && (
                            <button onClick={() => setPendingDelete(rowIndex)} className="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:bg-slate-900">
                              <Trash2 className="h-3.5 w-3.5" /> {deleteLabel}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t bg-slate-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/40">
          <p className="text-xs font-semibold text-slate-500">Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, rows.length)} of {rows.length}</p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="inline-flex h-8 items-center gap-1 rounded-md border bg-white px-2.5 text-xs font-semibold transition-colors hover:bg-slate-50 disabled:opacity-50 dark:bg-slate-900">
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <span className="text-xs font-bold text-slate-500">Page {page} of {pageCount}</span>
            <button type="button" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="inline-flex h-8 items-center gap-1 rounded-md border bg-white px-2.5 text-xs font-semibold transition-colors hover:bg-slate-50 disabled:opacity-50 dark:bg-slate-900">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Confirm ${deleteLabel}`}
        message={`Are you sure you want to ${deleteLabel.toLowerCase()} this record? This action will be logged for audit purposes.`}
        confirmLabel={deleteLabel}
        onConfirm={() => {
          if (pendingDelete !== null) onDelete?.(pendingDelete);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

function statusClass(value: string) {
  if (["Active", "Paid", "Allowed", "Completed"].includes(value)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["Maintenance", "Partial", "InProgress"].includes(value)) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}
