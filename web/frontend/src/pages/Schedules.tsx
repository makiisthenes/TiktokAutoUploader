import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Schedules } from "../api/client";
import { Ban, RotateCw, Trash2 } from "lucide-react";

const statusClass = (s: string) => {
  switch (s) {
    case "succeeded": return "bg-emerald-100 text-emerald-700";
    case "failed":    return "bg-red-100 text-red-700";
    case "running":   return "bg-blue-100 text-blue-700";
    case "cancelled": return "bg-slate-200 text-slate-600";
    default:          return "bg-amber-100 text-amber-700"; // pending
  }
};

export default function SchedulesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["schedules"],
    queryFn: Schedules.list,
    refetchInterval: 5000, // poll while the scheduler works
  });

  const cancelMut = useMutation({
    mutationFn: (id: number) => Schedules.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
  const retryMut = useMutation({
    mutationFn: (id: number) => Schedules.retry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => Schedules.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Schedules</h2>
        <p className="text-sm text-slate-500 mt-1">
          Future uploads handled by the scheduler service.
        </p>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left p-3">When</th>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">Source</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Attempts</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td className="p-4 text-slate-500" colSpan={6}>Loading…</td></tr>}
            {!isLoading && data && data.length === 0 && (
              <tr><td className="p-6 text-center text-slate-500" colSpan={6}>Nothing scheduled.</td></tr>
            )}
            {data?.map(s => (
              <tr key={s.id}>
                <td className="p-3 text-slate-600">
                  {new Date(s.scheduled_for).toLocaleString()}
                </td>
                <td className="p-3 font-medium max-w-xs truncate" title={s.title}>{s.title}</td>
                <td className="p-3 text-slate-500 text-xs">
                  {s.source_type === "youtube" ? "YouTube" : "File"}
                </td>
                <td className="p-3">
                  <span className={"chip " + statusClass(s.status)}>{s.status}</span>
                  {s.result_text && (
                    <div className="text-xs text-slate-500 mt-1 max-w-xs truncate" title={s.result_text}>
                      {s.result_text}
                    </div>
                  )}
                </td>
                <td className="p-3 text-slate-500">{s.attempts}</td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  {s.status === "pending" && (
                    <button className="text-xs text-slate-600" onClick={() => cancelMut.mutate(s.id)}>
                      <Ban size={14} className="inline" /> Cancel
                    </button>
                  )}
                  {s.status === "failed" && (
                    <button className="text-xs text-brand-600" onClick={() => retryMut.mutate(s.id)}>
                      <RotateCw size={14} className="inline" /> Retry
                    </button>
                  )}
                  {s.status !== "running" && (
                    <button className="text-xs text-red-600" onClick={() => deleteMut.mutate(s.id)}>
                      <Trash2 size={14} className="inline" /> Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
