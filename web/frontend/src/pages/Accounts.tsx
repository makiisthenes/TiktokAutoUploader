import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Trash2, RefreshCcw, LogIn, Download, Globe, ShieldCheck } from "lucide-react";
import { Account, Accounts, Proxies, errorMessage } from "../api/client";

function ProxyCell({ account }: { account: Account }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (proxy: string) => Accounts.update(account.id, { proxy }),
    onSuccess: () => {
      setEditing(false);
      setNote(null);
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: e => setNote(errorMessage(e)),
  });
  const test = useMutation({
    mutationFn: () => Proxies.test({ account_id: account.id }),
    onSuccess: r => setNote(r.ok ? `TikTok will see ${r.ip}` : r.error ?? "proxy test failed"),
    onError: e => setNote(errorMessage(e)),
  });

  if (editing) {
    return (
      <div className="space-y-1">
        <div className="flex gap-1">
          <input
            className="input py-1 text-xs"
            placeholder="http://user:pass@host:port"
            value={value}
            onChange={e => setValue(e.target.value)}
            autoFocus
          />
          <button className="btn-primary px-2 py-1 text-xs" onClick={() => save.mutate(value)}>
            Save
          </button>
          <button className="btn-secondary px-2 py-1 text-xs" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
        <p className="text-xs text-slate-500">Leave empty and save to remove the proxy.</p>
        {note && <p className="text-xs text-red-600">{note}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-slate-600 truncate max-w-[16rem]" title={account.proxy ?? ""}>
          {account.proxy ?? "direct (no proxy)"}
        </span>
        <button
          className="text-xs text-brand-600"
          onClick={() => {
            setValue("");
            setNote(null);
            setEditing(true);
          }}
        >
          {account.proxy ? "Change" : "Add"}
        </button>
        <button className="text-xs text-slate-500" onClick={() => test.mutate()} disabled={test.isPending}>
          <Globe size={12} className="inline" /> {test.isPending ? "Testing…" : "Test"}
        </button>
      </div>
      {note && <p className="text-xs text-slate-500 mt-1">{note}</p>}
    </div>
  );
}

export default function AccountsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["accounts"], queryFn: Accounts.list });
  const [checkNote, setCheckNote] = useState<Record<number, string>>({});

  const importMut = useMutation({
    mutationFn: Accounts.importFromDisk,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => Accounts.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });

  const checkMut = useMutation({
    mutationFn: (id: number) => Accounts.check(id),
    onSuccess: (r, id) => {
      setCheckNote(n => ({ ...n, [id]: r.valid ? "session OK" : "session rejected" }));
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e, id) => setCheckNote(n => ({ ...n, [id]: errorMessage(e) })),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Accounts</h2>
          <p className="text-sm text-slate-500 mt-1">
            TikTok accounts saved via the CLI or browser login. Each account uses its own proxy for
            login, signing and uploads.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary"
            onClick={() => importMut.mutate()}
            disabled={importMut.isPending}
          >
            <Download size={16} />
            Import from disk
          </button>
          <Link to="/login" className="btn-primary">
            <LogIn size={16} />
            Add via browser
          </Link>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left p-3">Username</th>
              <th className="text-left p-3">Session</th>
              <th className="text-left p-3">Proxy</th>
              <th className="text-left p-3">Last used</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td className="p-4 text-slate-500" colSpan={5}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && data && data.length === 0 && (
              <tr>
                <td className="p-6 text-center text-slate-500" colSpan={5}>
                  No accounts yet. Use "Add via browser" or "Import from disk".
                </td>
              </tr>
            )}
            {data?.map(a => (
              <tr key={a.id} className="hover:bg-slate-50 align-top">
                <td className="p-3">
                  <div className="font-medium">{a.username}</div>
                  {a.display_name && <div className="text-xs text-slate-500">{a.display_name}</div>}
                </td>
                <td className="p-3">
                  <span
                    className={
                      "chip " +
                      (a.has_valid_session
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700")
                    }
                  >
                    {a.has_valid_session ? "valid" : "needs re-login"}
                  </span>
                  {checkNote[a.id] && <div className="text-xs text-slate-500 mt-1">{checkNote[a.id]}</div>}
                </td>
                <td className="p-3">
                  <ProxyCell account={a} />
                </td>
                <td className="p-3 text-slate-500">
                  {a.last_used_at ? new Date(a.last_used_at).toLocaleString() : "—"}
                </td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  <button
                    className="inline-flex items-center gap-1 text-slate-600 text-xs font-medium"
                    onClick={() => checkMut.mutate(a.id)}
                    disabled={checkMut.isPending && checkMut.variables === a.id}
                  >
                    <ShieldCheck size={14} /> Check
                  </button>
                  <Link
                    to={`/login?username=${encodeURIComponent(a.username)}`}
                    className="inline-flex items-center gap-1 text-brand-600 text-xs font-medium"
                  >
                    <RefreshCcw size={14} /> Re-login
                  </Link>
                  <button
                    className="inline-flex items-center gap-1 text-red-600 text-xs font-medium"
                    onClick={() => {
                      if (window.confirm(`Delete '${a.username}' and its saved session?`)) deleteMut.mutate(a.id);
                    }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
