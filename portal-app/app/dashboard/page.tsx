import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  Check,
  Download,
  ExternalLink,
  FolderOpen,
  ListTodo,
} from "lucide-react";
import { MidvoraBrand } from "@/components/midvora-brand";
import { PortalFooter } from "@/components/portal-footer";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUserProfile } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";

type ClientRecord = {
  id: string;
  business_name: string;
  status: string | null;
  go_live_date: string | null;
  plan: string | null;
  hidden_dashboard_sections: string[] | null;
};

type TaskRecord = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: "todo" | "done";
};

type AssetRecord = {
  id: string;
  client_id: string;
  label: string | null;
  type: string | null;
  storage_path: string | null;
};

type SignedAsset = AssetRecord & {
  signedUrl: string;
};

type MeetingRecord = {
  id: string;
  title: string | null;
  scheduled_at: string | null;
  meeting_url: string | null;
};

type MetricsRecord = {
  id: string;
  period_month: string | null;
  site_visits: number | null;
  calls_from_site: number | null;
  seo_rank_change: number | null;
  new_reviews: number | null;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const meetingFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Chicago",
  timeZoneName: "short",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(`${value}T00:00:00Z`)) : "—";
}

function formatMeetingDate(value: string) {
  return meetingFormatter.format(new Date(value));
}

function formatMonth(value: string | null) {
  return value
    ? monthFormatter.format(new Date(`${value}T00:00:00Z`))
    : "Latest report";
}

function formatLabel(value: string | null) {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

async function markTaskDone(formData: FormData) {
  "use server";

  const current = await getCurrentUserProfile();
  if (!current) {
    redirect("/login");
  }

  const { profile } = current;
  if (profile.role !== "client" || !profile.client_id) {
    redirect("/dashboard");
  }

  const taskId = formData.get("taskId");
  if (
    typeof taskId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      taskId
    )
  ) {
    return;
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("tasks")
    .update({ status: "done" })
    .eq("id", taskId)
    .eq("client_id", profile.client_id)
    .eq("status", "todo");

  if (error) {
    throw new Error("Unable to update this task.");
  }

  revalidatePath("/dashboard");
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function ClientViewNotice() {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="border-b border-brand-navy/10 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <MidvoraBrand label="Client portal" />
          <SignOutButton />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Client workspace unavailable</CardTitle>
            <CardDescription>
              Your login is not linked to a client yet. Contact Midvora for help.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
      <PortalFooter context="Client portal" />
    </div>
  );
}

export default async function DashboardPage() {
  const current = await getCurrentUserProfile();

  if (!current) {
    redirect("/login");
  }

  const { profile, user } = current;

  if (profile.role === "admin") {
    redirect("/admin");
  }

  // Profiles without a client must never run client-data queries.
  if (!profile.client_id) {
    return <ClientViewNotice />;
  }

  const clientId = profile.client_id;
  const supabase = await createServerSupabase();
  const now = new Date().toISOString();

  const [clientResult, tasksResult, assetsResult, meetingsResult, metricsResult] =
    await Promise.all([
      supabase
        .from("clients")
        .select(
          "id, business_name, status, go_live_date, plan, hidden_dashboard_sections"
        )
        .eq("id", clientId)
        .maybeSingle(),
      supabase
        .from("tasks")
        .select("id, client_id, title, description, due_date, status")
        .eq("client_id", clientId)
        .order("status", { ascending: false })
        .order("due_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("assets")
        .select("id, client_id, label, type, storage_path")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false }),
      supabase
        .from("meetings")
        .select("id, title, scheduled_at, meeting_url")
        .eq("client_id", clientId)
        .gte("scheduled_at", now)
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("metrics")
        .select(
          "id, period_month, site_visits, calls_from_site, seo_rank_change, new_reviews"
        )
        .eq("client_id", clientId)
        .order("period_month", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (
    clientResult.error ||
    tasksResult.error ||
    assetsResult.error ||
    meetingsResult.error ||
    metricsResult.error
  ) {
    throw new Error("Unable to load the client dashboard.");
  }

  const client = clientResult.data as ClientRecord | null;
  const tasks = (tasksResult.data ?? []) as TaskRecord[];
  const assets = (assetsResult.data ?? []) as AssetRecord[];
  const meetings = (meetingsResult.data ?? []) as MeetingRecord[];
  const metrics = metricsResult.data as MetricsRecord | null;

  if (!client) {
    return <ClientViewNotice />;
  }

  const hiddenSections = new Set(client.hidden_dashboard_sections ?? []);

  // Signed URLs live for five minutes. Asset ownership and the expected first
  // path folder are both checked before the RLS-bound storage request is made.
  const signedAssets: SignedAsset[] = hiddenSections.has("assets")
    ? []
    : (
        await Promise.all(
          assets.map(async (asset): Promise<SignedAsset | null> => {
            if (
              asset.client_id !== clientId ||
              !asset.storage_path ||
              !asset.storage_path.startsWith(`${clientId}/`)
            ) {
              return null;
            }

            const { data, error } = await supabase.storage
              .from("client-assets")
              .createSignedUrl(asset.storage_path, 300);

            if (error || !data?.signedUrl) {
              return null;
            }

            return { ...asset, signedUrl: data.signedUrl };
          })
        )
      ).filter((asset): asset is SignedAsset => asset !== null);

  const seoChange = metrics?.seo_rank_change ?? 0;
  const seoChangeLabel =
    seoChange > 0
      ? `${seoChange} ${seoChange === 1 ? "position" : "positions"} up`
      : seoChange < 0
        ? `${Math.abs(seoChange)} ${Math.abs(seoChange) === 1 ? "position" : "positions"} down`
        : "No change";

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="relative overflow-hidden bg-brand-navy text-white shadow-[0_8px_30px_rgba(10,22,40,0.12)]">
        <div className="absolute -right-24 -top-28 size-72 rounded-full bg-brand-blue/20 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 size-48 rounded-full bg-brand-orange/10 blur-3xl" />
        <div className="h-1 bg-gradient-to-r from-brand-blue via-brand-blue to-brand-orange" />

        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-4 sm:px-6 sm:pb-10">
          <div className="flex items-center justify-between gap-4">
            <MidvoraBrand theme="dark" label="Client portal" />
            <SignOutButton className="border-white/15 bg-white/[0.06] text-white hover:bg-white/10 hover:text-white" />
          </div>

          <div className="mt-10 max-w-3xl sm:mt-12">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/55">
              <span className="h-px w-6 bg-brand-orange" aria-hidden="true" />
              Your workspace
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Welcome back, {client.business_name}
            </h1>
            <p className="mt-3 truncate text-sm text-white/55">
              {profile.full_name || user.email}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {!hiddenSections.has("overview") && (
          <section aria-labelledby="overview-heading">
            <h2 id="overview-heading" className="sr-only">
              Project overview
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">Project status</p>
                  <p className="mt-2 font-display text-2xl font-semibold text-brand-navy">
                    {formatLabel(client.status)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">Go-live target</p>
                  <p className="mt-2 font-display text-2xl font-semibold text-brand-navy">
                    {formatDate(client.go_live_date)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="mt-2 font-display text-2xl font-semibold text-brand-navy">
                    {client.plan || "—"}
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {!hiddenSections.has("tasks") && (
          <section aria-labelledby="tasks-heading">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-blue-tint p-2 text-brand-blue">
                  <ListTodo aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <CardTitle id="tasks-heading">Your tasks</CardTitle>
                  <CardDescription className="mt-1">
                    The next steps for your project.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <EmptyState>You have no tasks right now.</EmptyState>
              ) : (
                <ul className="divide-y divide-border">
                  {tasks.map((task) => {
                    const isDone = task.status === "done";

                    return (
                      <li
                        key={task.id}
                        className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {isDone && (
                              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                <Check aria-hidden="true" className="size-3.5" />
                              </span>
                            )}
                            <p
                              className={
                                isDone
                                  ? "font-medium text-muted-foreground line-through"
                                  : "font-medium text-brand-navy"
                              }
                            >
                              {task.title}
                            </p>
                          </div>
                          {task.description && (
                            <p className="mt-1 text-sm text-muted-foreground sm:ml-7">
                              {task.description}
                            </p>
                          )}
                          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:ml-7">
                            {task.due_date
                              ? `Due ${formatDate(task.due_date)}`
                              : "No due date"}
                          </p>
                        </div>
                        {isDone ? (
                          <span className="self-start rounded-pill bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:self-auto">
                            Done
                          </span>
                        ) : (
                          <form action={markTaskDone} className="shrink-0">
                            <input type="hidden" name="taskId" value={task.id} />
                            <Button type="submit" size="sm" variant="outline">
                              Mark done
                            </Button>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
          </section>
        )}

        {(!hiddenSections.has("assets") || !hiddenSections.has("meetings")) && (
          <div className="grid gap-6 lg:grid-cols-2">
          {!hiddenSections.has("assets") && (
            <section aria-labelledby="assets-heading">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-blue-tint p-2 text-brand-blue">
                    <FolderOpen aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <CardTitle id="assets-heading">Resources and assets</CardTitle>
                    <CardDescription className="mt-1">
                      Files shared with your team.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {signedAssets.length === 0 ? (
                  <EmptyState>No resources have been shared yet.</EmptyState>
                ) : (
                  <ul className="divide-y divide-border">
                    {signedAssets.map((asset) => (
                      <li
                        key={asset.id}
                        className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-brand-navy">
                            {asset.label || "Untitled asset"}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatLabel(asset.type)}
                          </p>
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <a href={asset.signedUrl} download>
                            <Download aria-hidden="true" />
                            Download
                          </a>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            </section>
          )}

          {!hiddenSections.has("meetings") && (
            <section aria-labelledby="meetings-heading">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-blue-tint p-2 text-brand-blue">
                    <CalendarClock aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <CardTitle id="meetings-heading">Upcoming meetings</CardTitle>
                    <CardDescription className="mt-1">
                      Your next scheduled conversations.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {meetings.length === 0 ? (
                  <EmptyState>No upcoming meetings are scheduled.</EmptyState>
                ) : (
                  <ul className="divide-y divide-border">
                    {meetings.map((meeting) => (
                      <li
                        key={meeting.id}
                        className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-brand-navy">
                            {meeting.title || "Meeting with Midvora"}
                          </p>
                          {meeting.scheduled_at && (
                            <time
                              dateTime={meeting.scheduled_at}
                              className="mt-1 block text-sm text-muted-foreground"
                            >
                              {formatMeetingDate(meeting.scheduled_at)}
                            </time>
                          )}
                        </div>
                        {meeting.meeting_url && (
                          <Button asChild size="sm" variant="outline">
                            <a
                              href={meeting.meeting_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Join
                              <ExternalLink aria-hidden="true" />
                            </a>
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            </section>
          )}
          </div>
        )}

        {!hiddenSections.has("metrics") && (
          <section aria-labelledby="metrics-heading">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-blue-tint p-2 text-brand-blue">
                  <BarChart3 aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <CardTitle id="metrics-heading">This month at a glance</CardTitle>
                  <CardDescription className="mt-1">
                    {metrics
                      ? `Reporting period: ${formatMonth(metrics.period_month)}`
                      : "Your latest website performance report."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!metrics ? (
                <EmptyState>No performance metrics are available yet.</EmptyState>
              ) : (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-sm text-muted-foreground">Site visits</p>
                    <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-brand-navy">
                      {(metrics.site_visits ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-sm text-muted-foreground">Calls from site</p>
                    <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-brand-navy">
                      {(metrics.calls_from_site ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-sm text-muted-foreground">SEO rank</p>
                    <p className="mt-2 font-display text-xl font-semibold text-brand-navy sm:text-2xl">
                      {seoChangeLabel}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-sm text-muted-foreground">New reviews</p>
                    <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-brand-navy">
                      {(metrics.new_reviews ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </section>
        )}
      </main>
      <PortalFooter context="Client portal" />
    </div>
  );
}
