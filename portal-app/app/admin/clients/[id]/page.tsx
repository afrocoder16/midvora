import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  FileUp,
  FolderOpen,
  Link2,
  ListTodo,
  PencilLine,
  Plus,
  Trash2,
  Undo2,
} from "lucide-react";
import { z } from "zod";
import {
  addMeetingAction,
  addTaskAction,
  deleteAssetAction,
  deleteMeetingAction,
  deleteTaskAction,
  linkExistingAuthUserAction,
  toggleTaskAction,
  updateClientAction,
  uploadAssetAction,
  upsertMetricsAction,
} from "@/app/admin/actions";
import { FlashMessage } from "@/components/admin/flash-message";
import { SectionVisibilityButton } from "@/components/admin/section-visibility-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

type ClientRecord = {
  id: string;
  business_name: string;
  slug: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  plan: string | null;
  status: string | null;
  go_live_date: string | null;
  hidden_dashboard_sections: string[] | null;
};

type TaskRecord = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: "todo" | "done";
};

type MeetingRecord = {
  id: string;
  title: string | null;
  scheduled_at: string | null;
  meeting_url: string | null;
  notes: string | null;
};

type MetricsRecord = {
  id: string;
  period_month: string | null;
  site_visits: number | null;
  calls_from_site: number | null;
  seo_rank_change: number | null;
  new_reviews: number | null;
};

type AssetRecord = {
  id: string;
  label: string | null;
  type: string | null;
  storage_path: string | null;
};

type LinkedProfile = {
  id: string;
  full_name: string | null;
};

type ClientDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string | string[];
    success?: string | string[];
  }>;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
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

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string | null) {
  return value
    ? dateFormatter.format(new Date(`${value}T00:00:00Z`))
    : "No date";
}

function formatDateTime(value: string | null) {
  return value ? dateTimeFormatter.format(new Date(value)) : "Not scheduled";
}

function formatMonth(value: string | null) {
  return value
    ? monthFormatter.format(new Date(`${value}T00:00:00Z`))
    : "Unknown month";
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: ClientDetailPageProps) {
  await requireAdmin();

  const routeParams = await params;
  const idResult = z.string().uuid().safeParse(routeParams.id);
  if (!idResult.success) {
    notFound();
  }

  const clientId = idResult.data;
  const messages = await searchParams;
  const admin = createAdminClient();
  const [
    clientResult,
    tasksResult,
    meetingsResult,
    metricsResult,
    assetsResult,
    profilesResult,
  ] = await Promise.all([
    admin
      .from("clients")
      .select(
        "id, business_name, slug, contact_name, contact_email, contact_phone, website_url, plan, status, go_live_date, hidden_dashboard_sections"
      )
      .eq("id", clientId)
      .maybeSingle(),
    admin
      .from("tasks")
      .select("id, title, description, due_date, status")
      .eq("client_id", clientId)
      .order("status", { ascending: false })
      .order("due_date", { ascending: true, nullsFirst: false }),
    admin
      .from("meetings")
      .select("id, title, scheduled_at, meeting_url, notes")
      .eq("client_id", clientId)
      .order("scheduled_at", { ascending: false, nullsFirst: false }),
    admin
      .from("metrics")
      .select(
        "id, period_month, site_visits, calls_from_site, seo_rank_change, new_reviews"
      )
      .eq("client_id", clientId)
      .order("period_month", { ascending: false, nullsFirst: false }),
    admin
      .from("assets")
      .select("id, label, type, storage_path")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
    admin
      .from("profiles")
      .select("id, full_name")
      .eq("client_id", clientId)
      .eq("role", "client")
      .order("created_at", { ascending: true }),
  ]);

  if (!clientResult.data && !clientResult.error) {
    notFound();
  }

  if (
    clientResult.error ||
    tasksResult.error ||
    meetingsResult.error ||
    metricsResult.error ||
    assetsResult.error ||
    profilesResult.error
  ) {
    throw new Error("Unable to load this client workspace.");
  }

  const client = clientResult.data as ClientRecord;
  const tasks = (tasksResult.data ?? []) as TaskRecord[];
  const meetings = (meetingsResult.data ?? []) as MeetingRecord[];
  const metrics = (metricsResult.data ?? []) as MetricsRecord[];
  const assets = (assetsResult.data ?? []) as AssetRecord[];
  const linkedProfiles = (profilesResult.data ?? []) as LinkedProfile[];
  const hiddenSections = new Set(client.hidden_dashboard_sections ?? []);

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin">
            <ArrowLeft aria-hidden="true" />
            All clients
          </Link>
        </Button>
        <div className="mt-5">
          <p className="text-sm font-medium text-brand-blue">Client workspace</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-brand-navy">
            {client.business_name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">/{client.slug}</p>
        </div>
      </div>

      <FlashMessage
        error={firstValue(messages.error)}
        success={firstValue(messages.success)}
      />

      <div className="rounded-lg border border-blue-200 bg-blue-tint/60 px-4 py-3 text-sm text-brand-navy">
        <span className="font-semibold">Dashboard visibility:</span> Remove hides
        that section from this client without deleting its data. Use Restore to
        show it again.
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section aria-labelledby="details-heading">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-blue-tint p-2 text-brand-blue">
                    <PencilLine aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <CardTitle id="details-heading">Client details</CardTitle>
                    <CardDescription className="mt-1">
                      Update project and contact information.
                    </CardDescription>
                  </div>
                </div>
                <SectionVisibilityButton
                  clientId={client.id}
                  sectionKey="overview"
                  hidden={hiddenSections.has("overview")}
                />
              </div>
              {hiddenSections.has("overview") && (
                <p className="text-xs font-medium text-brand-orange">
                  Project overview is hidden from this client.
                </p>
              )}
            </CardHeader>
            <CardContent>
              <form action={updateClientAction} className="space-y-5">
                <input type="hidden" name="clientId" value={client.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Input
                      id="status"
                      name="status"
                      defaultValue={client.status ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plan">Plan</Label>
                    <Input
                      id="plan"
                      name="plan"
                      defaultValue={client.plan ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goLiveDate">Go-live target</Label>
                    <Input
                      id="goLiveDate"
                      name="goLiveDate"
                      type="date"
                      defaultValue={client.go_live_date ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact name</Label>
                    <Input
                      id="contactName"
                      name="contactName"
                      defaultValue={client.contact_name ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact email</Label>
                    <Input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      defaultValue={client.contact_email ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Contact phone</Label>
                    <Input
                      id="contactPhone"
                      name="contactPhone"
                      type="tel"
                      defaultValue={client.contact_phone ?? ""}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <Input
                    id="websiteUrl"
                    name="websiteUrl"
                    type="url"
                    defaultValue={client.website_url ?? ""}
                    placeholder="https://"
                  />
                </div>
                <Button type="submit">Save client details</Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="login-heading">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-blue-tint p-2 text-brand-blue">
                  <Link2 aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <CardTitle id="login-heading">Client login</CardTitle>
                  <CardDescription className="mt-1">
                    Link an Auth user created in Supabase.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                <ol className="list-decimal space-y-2 pl-5">
                  <li>Create the user in Supabase Authentication.</li>
                  <li>Copy the user UID from the Supabase dashboard.</li>
                  <li>Paste it below to link the login to this client.</li>
                </ol>
              </div>

              <form action={linkExistingAuthUserAction} className="space-y-3">
                <input type="hidden" name="clientId" value={client.id} />
                <div className="space-y-2">
                  <Label htmlFor="userId">Existing Auth user UID</Label>
                  <Input
                    id="userId"
                    name="userId"
                    placeholder="00000000-0000-0000-0000-000000000000"
                    required
                  />
                </div>
                <Button type="submit">Link existing Auth user</Button>
              </form>

              {linkedProfiles.length > 0 && (
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium text-brand-navy">
                    Linked client profiles
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {linkedProfiles.map((profile) => (
                      <li key={profile.id} className="break-all rounded-md bg-muted/40 p-2">
                        {profile.full_name ? `${profile.full_name} — ` : ""}
                        {profile.id}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <section aria-labelledby="tasks-heading">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-blue-tint p-2 text-brand-blue">
                  <ListTodo aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <CardTitle id="tasks-heading">Tasks</CardTitle>
                  <CardDescription className="mt-1">
                    Add, complete, reopen, or remove client tasks.
                  </CardDescription>
                </div>
              </div>
              <SectionVisibilityButton
                clientId={client.id}
                sectionKey="tasks"
                hidden={hiddenSections.has("tasks")}
              />
            </div>
            {hiddenSections.has("tasks") && (
              <p className="text-xs font-medium text-brand-orange">
                Tasks are hidden from this client.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              action={addTaskAction}
              className="grid gap-4 rounded-xl border border-border bg-muted/20 p-4 md:grid-cols-[1fr_1.4fr_auto] md:items-end"
            >
              <input type="hidden" name="clientId" value={client.id} />
              <div className="space-y-2">
                <Label htmlFor="taskTitle">Task title *</Label>
                <Input id="taskTitle" name="title" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskDescription">Description</Label>
                <Input id="taskDescription" name="description" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskDueDate">Due date</Label>
                <Input id="taskDueDate" name="dueDate" type="date" />
              </div>
              <Button type="submit" className="md:col-span-3 md:justify-self-start">
                <Plus aria-hidden="true" />
                Add task
              </Button>
            </form>

            {tasks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                No tasks yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {task.status === "done" && (
                          <CheckCircle2
                            aria-hidden="true"
                            className="size-4 shrink-0 text-emerald-600"
                          />
                        )}
                        <p
                          className={
                            task.status === "done"
                              ? "font-medium text-muted-foreground line-through"
                              : "font-medium text-brand-navy"
                          }
                        >
                          {task.title}
                        </p>
                      </div>
                      {task.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {task.description}
                        </p>
                      )}
                      <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                        {task.due_date ? `Due ${formatDate(task.due_date)}` : "No due date"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <form action={toggleTaskAction}>
                        <input type="hidden" name="clientId" value={client.id} />
                        <input type="hidden" name="taskId" value={task.id} />
                        <input
                          type="hidden"
                          name="nextStatus"
                          value={task.status === "done" ? "todo" : "done"}
                        />
                        <Button type="submit" size="sm" variant="outline">
                          {task.status === "done" ? (
                            <Undo2 aria-hidden="true" />
                          ) : (
                            <CheckCircle2 aria-hidden="true" />
                          )}
                          {task.status === "done" ? "Reopen" : "Done"}
                        </Button>
                      </form>
                      <form action={deleteTaskAction}>
                        <input type="hidden" name="clientId" value={client.id} />
                        <input type="hidden" name="taskId" value={task.id} />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 aria-hidden="true" />
                          <span className="sr-only">Delete {task.title}</span>
                        </Button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="meetings-heading">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-blue-tint p-2 text-brand-blue">
                  <CalendarClock aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <CardTitle id="meetings-heading">Meetings</CardTitle>
                  <CardDescription className="mt-1">
                    Schedule and manage client meetings.
                  </CardDescription>
                </div>
              </div>
              <SectionVisibilityButton
                clientId={client.id}
                sectionKey="meetings"
                hidden={hiddenSections.has("meetings")}
              />
            </div>
            {hiddenSections.has("meetings") && (
              <p className="text-xs font-medium text-brand-orange">
                Upcoming meetings are hidden from this client.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              action={addMeetingAction}
              className="grid gap-4 rounded-xl border border-border bg-muted/20 p-4 md:grid-cols-2"
            >
              <input type="hidden" name="clientId" value={client.id} />
              <div className="space-y-2">
                <Label htmlFor="meetingTitle">Title *</Label>
                <Input id="meetingTitle" name="title" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Date and time *</Label>
                <Input
                  id="scheduledAt"
                  name="scheduledAt"
                  type="datetime-local"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="meetingUrl">Meeting URL</Label>
                <Input
                  id="meetingUrl"
                  name="meetingUrl"
                  type="url"
                  placeholder="https://"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="meetingNotes">Notes</Label>
                <Textarea id="meetingNotes" name="notes" />
              </div>
              <Button type="submit" className="md:justify-self-start">
                <Plus aria-hidden="true" />
                Add meeting
              </Button>
            </form>

            {meetings.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                No meetings yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {meetings.map((meeting) => (
                  <li
                    key={meeting.id}
                    className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-brand-navy">
                        {meeting.title || "Meeting"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDateTime(meeting.scheduled_at)}
                      </p>
                      {meeting.meeting_url && (
                        <a
                          href={meeting.meeting_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-sm font-medium text-brand-blue hover:underline"
                        >
                          Open meeting link
                        </a>
                      )}
                      {meeting.notes && (
                        <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground">
                          {meeting.notes}
                        </p>
                      )}
                    </div>
                    <form action={deleteMeetingAction}>
                      <input type="hidden" name="clientId" value={client.id} />
                      <input type="hidden" name="meetingId" value={meeting.id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 aria-hidden="true" />
                        Delete
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="metrics-heading">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-blue-tint p-2 text-brand-blue">
                  <BarChart3 aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <CardTitle id="metrics-heading">Monthly metrics</CardTitle>
                  <CardDescription className="mt-1">
                    Add a month or overwrite an existing month’s report.
                  </CardDescription>
                </div>
              </div>
              <SectionVisibilityButton
                clientId={client.id}
                sectionKey="metrics"
                hidden={hiddenSections.has("metrics")}
              />
            </div>
            {hiddenSections.has("metrics") && (
              <p className="text-xs font-medium text-brand-orange">
                This month at a glance is hidden from this client.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              action={upsertMetricsAction}
              className="grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-5"
            >
              <input type="hidden" name="clientId" value={client.id} />
              <div className="space-y-2">
                <Label htmlFor="periodMonth">Month *</Label>
                <Input id="periodMonth" name="periodMonth" type="month" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteVisits">Site visits</Label>
                <Input
                  id="siteVisits"
                  name="siteVisits"
                  type="number"
                  min="0"
                  defaultValue="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="callsFromSite">Calls from site</Label>
                <Input
                  id="callsFromSite"
                  name="callsFromSite"
                  type="number"
                  min="0"
                  defaultValue="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seoRankChange">SEO rank change</Label>
                <Input
                  id="seoRankChange"
                  name="seoRankChange"
                  type="number"
                  defaultValue="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newReviews">New reviews</Label>
                <Input
                  id="newReviews"
                  name="newReviews"
                  type="number"
                  min="0"
                  defaultValue="0"
                  required
                />
              </div>
              <Button type="submit" className="sm:col-span-2 sm:justify-self-start lg:col-span-5">
                Save monthly metrics
              </Button>
            </form>

            {metrics.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                No metrics yet.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {metrics.map((row) => (
                  <div key={row.id} className="rounded-xl border border-border p-4">
                    <p className="font-display text-lg font-semibold text-brand-navy">
                      {formatMonth(row.period_month)}
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Visits</dt>
                        <dd className="font-semibold tabular-nums text-brand-navy">
                          {(row.site_visits ?? 0).toLocaleString()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Calls</dt>
                        <dd className="font-semibold tabular-nums text-brand-navy">
                          {(row.calls_from_site ?? 0).toLocaleString()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">SEO change</dt>
                        <dd className="font-semibold tabular-nums text-brand-navy">
                          {row.seo_rank_change ?? 0}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Reviews</dt>
                        <dd className="font-semibold tabular-nums text-brand-navy">
                          {row.new_reviews ?? 0}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="assets-heading">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-blue-tint p-2 text-brand-blue">
                  <FolderOpen aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <CardTitle id="assets-heading">Assets</CardTitle>
                  <CardDescription className="mt-1">
                    Upload files up to 10 MB to this client’s private folder.
                  </CardDescription>
                </div>
              </div>
              <SectionVisibilityButton
                clientId={client.id}
                sectionKey="assets"
                hidden={hiddenSections.has("assets")}
              />
            </div>
            {hiddenSections.has("assets") && (
              <p className="text-xs font-medium text-brand-orange">
                Resources and assets are hidden from this client.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              action={uploadAssetAction}
              className="grid gap-4 rounded-xl border border-border bg-muted/20 p-4 md:grid-cols-3 md:items-end"
            >
              <input type="hidden" name="clientId" value={client.id} />
              <div className="space-y-2">
                <Label htmlFor="assetLabel">Label</Label>
                <Input id="assetLabel" name="label" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assetType">Type</Label>
                <Input id="assetType" name="type" placeholder="Logo, document…" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assetFile">File *</Label>
                <Input id="assetFile" name="file" type="file" required />
              </div>
              <Button type="submit" className="md:col-span-3 md:justify-self-start">
                <FileUp aria-hidden="true" />
                Upload asset
              </Button>
            </form>

            {assets.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                No assets yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {assets.map((asset) => (
                  <li
                    key={asset.id}
                    className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-brand-navy">
                        {asset.label || "Untitled asset"}
                      </p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {asset.type || "File"}
                        {asset.storage_path ? ` — ${asset.storage_path}` : ""}
                      </p>
                    </div>
                    <form action={deleteAssetAction}>
                      <input type="hidden" name="clientId" value={client.id} />
                      <input type="hidden" name="assetId" value={asset.id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 aria-hidden="true" />
                        Delete
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
