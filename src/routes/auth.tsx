import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: "organizer" } => (s["mode"] === "organizer" ? { mode: "organizer" } : {}),
  head: () => ({
    meta: [
      { title: "Sign in — EpicEventz" },
      { name: "description", content: "Sign in or create an attendee or organizer account on EpicEventz." },
      { property: "og:title", content: "Sign in — EpicEventz" },
      { property: "og:description", content: "Sign in or create an attendee or organizer account on EpicEventz." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"in" | "up">(mode === "organizer" ? "up" : "in");
  const [type, setType] = useState<"attendee" | "organizer">(mode ?? "attendee");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (user && role) navigate({ to: role === "organizer" ? "/organizer" : "/events" });
  }, [user, role, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (tab === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin, data: { display_name: name, account_type: type } },
      });
      if (error) toast.error(error.message);
      else setSent(true);
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Google sign-in failed");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-4xl font-extrabold">{tab === "in" ? "Welcome back" : "Join EpicEventz"}</h1>
      {sent ? (
        <p className="mt-6 rounded-xl border border-accent/50 bg-card p-5">Check your inbox to confirm your email, then sign in.</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 rounded-lg bg-secondary p-1">
            {(["in", "up"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded-md py-2 text-sm font-semibold ${tab === t ? "bg-background" : "text-muted-foreground"}`}>
                {t === "in" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {tab === "up" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {(["attendee", "organizer"] as const).map((t) => (
                    <button type="button" key={t} onClick={() => setType(t)}
                      className={`rounded-xl border p-4 text-left ${type === t ? "border-primary bg-primary/10" : "border-border"}`}>
                      <p className="font-bold capitalize">{t}</p>
                      <p className="text-xs text-muted-foreground">{t === "attendee" ? "Find & buy tickets" : "Host & sell events"}</p>
                    </button>
                  ))}
                </div>
                <div className="space-y-1"><Label htmlFor="nm">Name</Label><Input id="nm" required value={name} onChange={(e) => setName(e.target.value)} /></div>
              </>
            )}
            <div className="space-y-1"><Label htmlFor="e">Email</Label><Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="p">Password</Label><Input id="p" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <Button type="submit" className="w-full" size="lg" disabled={busy}>{tab === "in" ? "Sign in" : "Create account"}</Button>
          </form>
          <div className="my-6 text-center text-xs text-muted-foreground">or</div>
          <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">Google sign-in creates an attendee account.</p>
        </>
      )}
    </main>
  );
}
