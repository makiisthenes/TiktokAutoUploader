import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { Trash2 } from "lucide-react";
import clsx from "clsx";
import { Videos, errorMessage } from "../api/client";

export default function VideosPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["videos"], queryFn: Videos.list });
  const [note, setNote] = useState<string | null>(null);

  const addMut = useMutation({
    mutationFn: (file: File) => Videos.add(file),
    onSuccess: v => {
      setNote(`Added ${v.name}`);
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
    onError: e => setNote(`Error: ${errorMessage(e)}`),
  });
  const removeMut = useMutation({
    mutationFn: (name: string) => Videos.remove(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
    onError: e => setNote(`Error: ${errorMessage(e)}`),
  });

  const dz = useDropzone({
    accept: { "video/mp4": [".mp4"], "video/webm": [".webm"], "video/quicktime": [".mov"] },
    multiple: true,
    onDrop: files => files.forEach(f => addMut.mutate(f)),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Videos</h2>
        <p className="text-sm text-slate-500 mt-1">
          Your video library. Videos here can be uploaded or scheduled from the Upload page.
        </p>
      </div>

      <div
        {...dz.getRootProps()}
        className={clsx(
          "rounded-md border-2 border-dashed p-6 text-center cursor-pointer bg-white",
          dz.isDragActive ? "border-brand-500 bg-brand-50" : "border-slate-200",
        )}
      >
        <input {...dz.getInputProps()} />
        <p className="text-sm text-slate-500">
          {addMut.isPending ? "Uploading…" : "Drop videos here to add them to the library"}
        </p>
      </div>
      {note && <p className="text-sm text-slate-600">{note}</p>}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Size</th>
              <th className="text-left p-3">Modified</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td className="p-4 text-slate-500" colSpan={4}>Loading…</td></tr>}
            {!isLoading && data && data.length === 0 && (
              <tr><td className="p-6 text-center text-slate-500" colSpan={4}>No videos.</td></tr>
            )}
            {data?.map(v => (
              <tr key={v.name}>
                <td className="p-3 font-medium">{v.name}</td>
                <td className="p-3 text-slate-500">{(v.size_bytes / 1024 / 1024).toFixed(1)} MB</td>
                <td className="p-3 text-slate-500">{new Date(v.modified_at).toLocaleString()}</td>
                <td className="p-3 text-right">
                  <button
                    className="inline-flex items-center gap-1 text-red-600 text-xs font-medium"
                    onClick={() => {
                      if (window.confirm(`Delete ${v.name}?`)) removeMut.mutate(v.name);
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
