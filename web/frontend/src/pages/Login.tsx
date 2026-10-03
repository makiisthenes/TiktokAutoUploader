import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, Globe } from "lucide-react";
import { Login, Proxies, ProxyProvider, errorMessage } from "../api/client";

const schema = z.object({
  username: z
    .string()
    .min(1, "Required")
    .max(128)
    .regex(/^[A-Za-z0-9_.\-]+$/, "Letters, digits, . _ - only"),
  proxy: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

type Phase = "idle" | "starting" | "pending" | "active" | "completing" | "completed" | "failed" | "expired";

// "own", "none", or a provider's key.
type ProxyChoice = string;

function ChoiceRow(props: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  badge?: string;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer ${
        props.checked ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50"
      }`}
    >
      <input type="radio" className="mt-1" checked={props.checked} onChange={props.onSelect} />
      <span className="text-sm">
        <span className="font-medium">{props.title}</span>
        {props.badge && <span className="chip bg-amber-100 text-amber-800 ml-2">{props.badge}</span>}
        {props.description && <span className="block text-xs text-slate-500 mt-0.5">{props.description}</span>}
      </span>
    </label>
  );
}

function ProviderSteps({ provider }: { provider: ProxyProvider }) {
  return (
    <div className="rounded-md bg-slate-50 p-3 space-y-2 text-xs text-slate-600">
      <a href={provider.signup_url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
        Open {provider.name} <ExternalLink size={14} />
      </a>
      {provider.steps.length > 0 && (
        <ol className="list-decimal pl-4 space-y-0.5">
          {provider.steps.map(step => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
      <p>
        Then paste the proxy below (<span className="font-mono">{provider.proxy_format}</span>).
      </p>
    </div>
  );
}

export default function LoginPage() {
  const [params] = useSearchParams();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: params.get("username") ?? "", proxy: "" },
  });
  const [phase, setPhase] = useState<Phase>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [vncUrl, setVncUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proxyChoice, setProxyChoice] = useState<ProxyChoice>("own");
  const [proxyNote, setProxyNote] = useState<string | null>(null);
  const { data: providers = [] } = useQuery({ queryKey: ["proxy-providers"], queryFn: Proxies.providers });
  const provider = providers.find(p => p.key === proxyChoice);
  const testProxy = useMutation({
    mutationFn: (proxy: string) => Proxies.test({ proxy }),
    onSuccess: r => setProxyNote(r.ok ? `It works. TikTok will see ${r.ip}.` : r.error ?? "Proxy test failed."),
    onError: e => setProxyNote(errorMessage(e)),
  });
  const esRef = useRef<EventSource | null>(null);
  const activeRef = useRef<string | null>(null); // session to cancel if the page is left

  useEffect(() => {
    const cancelActive = () => {
      const id = activeRef.current;
      if (id) {
        fetch(`/api/login/browser/${id}`, {
          method: "DELETE",
          keepalive: true,
          headers: { "X-Requested-With": "autotok" },
        }).catch(() => undefined);
      }
    };
    window.addEventListener("beforeunload", cancelActive);
    return () => {
      window.removeEventListener("beforeunload", cancelActive);
      esRef.current?.close();
      cancelActive();
    };
  }, []);

  const onSubmit = async ({ username, proxy }: FormValues) => {
    if (proxyChoice === "none") proxy = undefined;
    if (provider && !proxy?.trim()) {
      form.setError("proxy", { message: `Paste the proxy from ${provider.name}, or pick No proxy.` });
      return;
    }
    setError(null);
    setPhase("starting");
    try {
      const r = await Login.start(username, proxy?.trim());
      setSessionId(r.session_id);
      activeRef.current = r.session_id;
      setVncUrl(r.vnc_url);
      const es = new EventSource(Login.eventStreamUrl(r.session_id));
      esRef.current = es;
      es.addEventListener("status", (e: MessageEvent) => {
        setPhase(e.data as Phase);
        if (["completed", "failed", "expired"].includes(e.data)) {
          activeRef.current = null;
          es.close();
        }
      });
      es.addEventListener("failure", (e: MessageEvent) => setError(e.data));
      es.onerror = () => {
        if (esRef.current?.readyState === EventSource.CLOSED) return;
        setError("Lost connection to the server — refresh to check the status.");
        es.close();
      };
    } catch (e: any) {
      setPhase("failed");
      setError(errorMessage(e));
    }
  };

  const reset = async () => {
    if (sessionId && !["completed", "failed", "expired"].includes(phase)) {
      await Login.cancel(sessionId).catch(() => undefined);
    }
    esRef.current?.close();
    activeRef.current = null;
    setPhase("idle");
    setSessionId(null);
    setVncUrl(null);
    setError(null);
  };

  const finished = ["completed", "failed", "expired"].includes(phase);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Browser login</h2>
        <p className="text-sm text-slate-500 mt-1">
          Log into TikTok inside a virtual browser. The session is saved as soon as you're logged in.
        </p>
      </div>

      {phase === "idle" && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="card space-y-4 max-w-md">
          <div>
            <label className="label">Account name</label>
            <input className="input" placeholder="my-account" {...form.register("username")} />
            {form.formState.errors.username && (
              <p className="text-xs text-red-600 mt-1">{form.formState.errors.username.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="label">Proxy</label>
            <p className="text-xs text-slate-500">
              Gives this account its own IP. Running several accounts? Use one residential proxy per account.
            </p>
            <ChoiceRow
              checked={proxyChoice === "own"}
              onSelect={() => setProxyChoice("own")}
              title="I have a proxy"
            />
            {providers.map(p => (
              <ChoiceRow
                key={p.key}
                checked={proxyChoice === p.key}
                onSelect={() => setProxyChoice(p.key)}
                title={`Get a proxy from ${p.name}`}
                description={p.tagline}
                badge={p.sponsor ? "Sponsor" : undefined}
              />
            ))}
            <ChoiceRow
              checked={proxyChoice === "none"}
              onSelect={() => setProxyChoice("none")}
              title="No proxy"
              description="Connect directly. A proxy already saved for this account is kept."
            />
            {provider && <ProviderSteps provider={provider} />}
            {proxyChoice !== "none" && (
              <div>
                <div className="flex gap-2">
                  <input
                    className="input font-mono"
                    placeholder={provider ? provider.proxy_format : "http://user:pass@host:port"}
                    {...form.register("proxy", { onChange: () => setProxyNote(null) })}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={testProxy.isPending}
                    onClick={() => {
                      const value = form.getValues("proxy")?.trim();
                      if (value) testProxy.mutate(value);
                      else setProxyNote("Paste a proxy to test it.");
                    }}
                  >
                    <Globe size={14} /> {testProxy.isPending ? "Testing…" : "Test"}
                  </button>
                </div>
                {form.formState.errors.proxy && (
                  <p className="text-xs text-red-600 mt-1">{form.formState.errors.proxy.message}</p>
                )}
                {proxyNote && <p className="text-xs text-slate-600 mt-1">{proxyNote}</p>}
                <p className="text-xs text-slate-500 mt-1">
                  Used for this login and saved for every upload from this account.
                  {proxyChoice === "own" && " Leave empty to keep the account's current proxy."}
                </p>
              </div>
            )}
          </div>
          <button className="btn-primary">Open virtual browser</button>
        </form>
      )}

      {phase !== "idle" && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              {sessionId && <span className="chip bg-brand-50 text-brand-700">session {sessionId.slice(0, 8)}</span>}
              <span className="ml-2 text-sm text-slate-600">
                Status: <b>{phase}</b>
              </span>
              {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
            </div>
            <button className="btn-secondary" onClick={reset}>
              {finished ? "Start over" : "Cancel"}
            </button>
          </div>
          {vncUrl && !finished && (
            <iframe
              title="Virtual browser"
              src={vncUrl}
              className="w-full border rounded-md"
              style={{ height: "600px" }}
            />
          )}
          {phase === "completed" && (
            <p className="text-sm text-emerald-700">
              Session captured. <Link to="/accounts" className="underline">Go to Accounts</Link>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
