import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDropzone } from "react-dropzone";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Accounts, Schedules, Uploads, Videos, errorMessage } from "../api/client";
import clsx from "clsx";

const ytRe =
  /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)[\w-]+/i;

const schema = z
  .object({
    username: z.string().min(1, "Select an account"),
    title: z.string().min(1, "Required").max(2200, "Max 2200 chars"),
    source_type: z.enum(["local", "library", "youtube"]),
    youtube_url: z.string().optional(),
    library_name: z.string().optional(),
    scheduled_for: z.string().optional(), // datetime-local
    // Checkboxes produce booleans; converted to 0/1 for the API.
    allow_comment: z.boolean(),
    allow_duet: z.boolean(),
    allow_stitch: z.boolean(),
    private: z.boolean(),
    ai_label: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (val.source_type === "youtube") {
      if (!val.youtube_url) {
        ctx.addIssue({ code: "custom", path: ["youtube_url"], message: "Required" });
      } else if (!ytRe.test(val.youtube_url)) {
        ctx.addIssue({ code: "custom", path: ["youtube_url"], message: "Not a valid YouTube URL" });
      }
    }
    if (val.source_type === "library" && !val.library_name) {
      ctx.addIssue({ code: "custom", path: ["library_name"], message: "Pick a video" });
    }
    if (val.scheduled_for) {
      const when = new Date(val.scheduled_for);
      if (isNaN(when.getTime()) || when.getTime() <= Date.now()) {
        ctx.addIssue({ code: "custom", path: ["scheduled_for"], message: "Must be in the future" });
      }
      if (val.private) {
        ctx.addIssue({ code: "custom", path: ["private"], message: "Private videos cannot be scheduled" });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

const SOURCES = [
  ["local", "Upload a file"],
  ["library", "From library"],
  ["youtube", "YouTube URL"],
] as const;

export default function UploadPage() {
  const qc = useQueryClient();
  const { data: accounts } = useQuery({ queryKey: ["accounts"], queryFn: Accounts.list });
  const { data: videos } = useQuery({ queryKey: ["videos"], queryFn: Videos.list });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      source_type: "local",
      allow_comment: true,
      allow_duet: false,
      allow_stitch: false,
      private: false,
      ai_label: false,
    },
  });
  const sourceType = form.watch("source_type");
  const selectedUser = form.watch("username");

  const dz = useDropzone({
    accept: { "video/mp4": [".mp4"], "video/webm": [".webm"], "video/quicktime": [".mov"] },
    maxFiles: 1,
    onDrop: files => {
      setFileError(null);
      setFile(files[0] ?? null);
    },
  });

  const submit = useMutation({
    mutationFn: async (values: FormValues) => {
      const options = {
        allow_comment: values.allow_comment ? 1 : 0,
        allow_duet: values.allow_duet ? 1 : 0,
        allow_stitch: values.allow_stitch ? 1 : 0,
        visibility_type: values.private ? 1 : 0,
        ai_label: values.ai_label ? 1 : 0,
      };

      if (values.scheduled_for) {
        let source_type: "local" | "youtube" = "youtube";
        let source_ref = values.youtube_url ?? "";
        if (values.source_type === "local") {
          // Save the dropped file to the library so the scheduler can find it later.
          const saved = await Videos.add(file!);
          qc.invalidateQueries({ queryKey: ["videos"] });
          source_type = "local";
          source_ref = saved.name;
        } else if (values.source_type === "library") {
          source_type = "local";
          source_ref = values.library_name!;
        }
        const r = await Schedules.create({
          username: values.username,
          title: values.title,
          source_type,
          source_ref,
          scheduled_for: new Date(values.scheduled_for).toISOString(),
          options,
        });
        return { ok: true, text: `Scheduled — job #${r.id} at ${new Date(r.scheduled_for).toLocaleString()}` };
      }

      if (values.source_type === "youtube") {
        const r = await Uploads.youtube({
          username: values.username,
          title: values.title,
          youtube_url: values.youtube_url,
          options,
        });
        return { ok: r.ok, text: r.ok ? `Published (video id ${r.video_id})` : r.message };
      }

      if (values.source_type === "library") {
        const r = await Uploads.library({
          username: values.username,
          title: values.title,
          name: values.library_name,
          options,
        });
        return { ok: r.ok, text: r.ok ? `Published (video id ${r.video_id})` : r.message };
      }

      const fd = new FormData();
      fd.append("video", file!);
      fd.append("username", values.username);
      fd.append("title", values.title);
      fd.append("options_json", JSON.stringify(options));
      const r = await Uploads.file(fd);
      return { ok: r.ok, text: r.ok ? `Published (video id ${r.video_id})` : r.message };
    },
    onSuccess: m => setMessage(m),
    onError: e => setMessage({ ok: false, text: `Error: ${errorMessage(e)}` }),
  });

  const onSubmit = (values: FormValues) => {
    setMessage(null);
    if (values.source_type === "local" && !file) {
      setFileError("Drop a video file, or pick another source");
      return;
    }
    submit.mutate(values);
  };

  const accountOptions = useMemo(
    () => (accounts ?? []).filter(a => a.has_valid_session),
    [accounts],
  );
  const selectedAccount = accountOptions.find(a => a.username === selectedUser);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Upload</h2>
        <p className="text-sm text-slate-500 mt-1">
          Upload now, or set a future time to hand the job to the scheduler.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="card space-y-5">
        <div>
          <label className="label">Account</label>
          <select className="input" {...form.register("username")}>
            <option value="">Select an account…</option>
            {accountOptions.map(a => (
              <option key={a.id} value={a.username}>
                {a.username}
              </option>
            ))}
          </select>
          {form.formState.errors.username && (
            <p className="text-xs text-red-600 mt-1">{form.formState.errors.username.message}</p>
          )}
          {selectedAccount && (
            <p className="text-xs text-slate-500 mt-1">
              Proxy: <span className="font-mono">{selectedAccount.proxy ?? "direct (no proxy)"}</span>
            </p>
          )}
        </div>

        <div className="flex gap-2 rounded-md bg-slate-100 p-1 w-fit">
          {SOURCES.map(([t, label]) => (
            <button
              key={t}
              type="button"
              className={clsx(
                "px-3 py-1.5 text-sm font-medium rounded",
                sourceType === t ? "bg-white shadow-sm" : "text-slate-500",
              )}
              onClick={() => form.setValue("source_type", t)}
            >
              {label}
            </button>
          ))}
        </div>

        {sourceType === "local" && (
          <div>
            <label className="label">Video</label>
            <div
              {...dz.getRootProps()}
              className={clsx(
                "rounded-md border-2 border-dashed p-8 text-center cursor-pointer",
                dz.isDragActive ? "border-brand-500 bg-brand-50" : "border-slate-200",
              )}
            >
              <input {...dz.getInputProps()} />
              {file ? (
                <p className="text-sm">
                  <span className="font-medium">{file.name}</span>{" "}
                  <span className="text-slate-500">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                </p>
              ) : (
                <p className="text-sm text-slate-500">Drop an .mp4, .webm or .mov here, or click to pick.</p>
              )}
            </div>
            {fileError && <p className="text-xs text-red-600 mt-1">{fileError}</p>}
          </div>
        )}

        {sourceType === "library" && (
          <div>
            <label className="label">Video from library</label>
            <select className="input" {...form.register("library_name")}>
              <option value="">Select a video…</option>
              {(videos ?? []).map(v => (
                <option key={v.name} value={v.name}>
                  {v.name} ({(v.size_bytes / 1024 / 1024).toFixed(1)} MB)
                </option>
              ))}
            </select>
            {form.formState.errors.library_name && (
              <p className="text-xs text-red-600 mt-1">{form.formState.errors.library_name.message}</p>
            )}
          </div>
        )}

        {sourceType === "youtube" && (
          <div>
            <label className="label">YouTube URL</label>
            <input className="input" placeholder="https://www.youtube.com/watch?v=…" {...form.register("youtube_url")} />
            {form.formState.errors.youtube_url && (
              <p className="text-xs text-red-600 mt-1">{form.formState.errors.youtube_url.message}</p>
            )}
          </div>
        )}

        <div>
          <label className="label">Caption</label>
          <textarea className="input h-20" {...form.register("title")} />
          {form.formState.errors.title && (
            <p className="text-xs text-red-600 mt-1">{form.formState.errors.title.message}</p>
          )}
        </div>

        <details className="border-t pt-4">
          <summary className="text-sm font-medium text-slate-600 cursor-pointer">Advanced options</summary>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {(
              [
                ["allow_comment", "Allow comments"],
                ["allow_duet", "Allow duet"],
                ["allow_stitch", "Allow stitch"],
                ["private", "Private"],
                ["ai_label", "Label as AI-generated"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register(key)} />
                {label}
              </label>
            ))}
          </div>
          {form.formState.errors.private && (
            <p className="text-xs text-red-600 mt-2">{form.formState.errors.private.message}</p>
          )}
        </details>

        <div>
          <label className="label">Schedule for (optional)</label>
          <input type="datetime-local" className="input w-fit" {...form.register("scheduled_for")} />
          {form.formState.errors.scheduled_for && (
            <p className="text-xs text-red-600 mt-1">{form.formState.errors.scheduled_for.message}</p>
          )}
          <p className="text-xs text-slate-500 mt-1">Leave blank to upload immediately.</p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className={clsx("text-sm", message?.ok === false ? "text-red-600" : "text-slate-600")}>
            {message?.text}
          </div>
          <button className="btn-primary" disabled={submit.isPending}>
            {submit.isPending ? "Working…" : form.watch("scheduled_for") ? "Schedule" : "Upload now"}
          </button>
        </div>
      </form>
    </div>
  );
}
