import Link from "next/link";
import { ArrowRight, Building2, Plus } from "lucide-react";
import { createClientAction } from "@/app/admin/actions";
import { FlashMessage } from "@/components/admin/flash-message";
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
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

type ClientSummary = {
  id: string;
  business_name: string;
  status: string | null;
  plan: string | null;
  go_live_date: string | null;
};

type AdminPageProps = {
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

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string | null) {
  return value
    ? dateFormatter.format(new Date(`${value}T00:00:00Z`))
    : "No target date";
}

function formatLabel(value: string | null) {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdmin();
  const messages = await searchParams;
  const { data, error } = await createAdminClient()
    .from("clients")
    .select("id, business_name, status, plan, go_live_date")
    .order("business_name", { ascending: true });

  if (error) {
    throw new Error("Unable to load clients.");
  }

  const clients = (data ?? []) as ClientSummary[];

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <div>
        <p className="text-sm font-medium text-brand-blue">Admin workspace</p>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-brand-navy">
          Clients
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Create client workspaces and manage every active engagement.
        </p>
      </div>

      <FlashMessage
        error={firstValue(messages.error)}
        success={firstValue(messages.success)}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)] lg:items-start">
        <section aria-labelledby="client-list-heading">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2
              id="client-list-heading"
              className="font-display text-2xl font-semibold text-brand-navy"
            >
              All clients
            </h2>
            <span className="rounded-pill bg-blue-tint px-3 py-1 text-xs font-semibold text-brand-blue">
              {clients.length} {clients.length === 1 ? "client" : "clients"}
            </span>
          </div>

          {clients.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2
                  aria-hidden="true"
                  className="mx-auto size-9 text-muted-foreground"
                />
                <p className="mt-4 font-medium text-brand-navy">No clients yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use the form to create the first client workspace.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {clients.map((client) => (
                <Card key={client.id}>
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-display text-xl font-semibold text-brand-navy">
                          {client.business_name}
                        </h3>
                        <span className="rounded-pill bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                          {formatLabel(client.status)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                        <span>Plan: {client.plan || "—"}</span>
                        <span>Go-live: {formatDate(client.go_live_date)}</span>
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/clients/${client.id}`}>
                        Manage
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="new-client-heading">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-blue-tint p-2 text-brand-blue">
                  <Plus aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <CardTitle id="new-client-heading">New client</CardTitle>
                  <CardDescription className="mt-1">
                    Required fields are marked below.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form action={createClientAction} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business name *</Label>
                  <Input id="businessName" name="businessName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    name="slug"
                    placeholder="acme-landscaping"
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    title="Use lowercase letters, numbers, and single hyphens."
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Lowercase letters, numbers, and hyphens only.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact name</Label>
                    <Input id="contactName" name="contactName" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact email</Label>
                    <Input id="contactEmail" name="contactEmail" type="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Contact phone</Label>
                    <Input id="contactPhone" name="contactPhone" type="tel" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="websiteUrl">Website URL</Label>
                    <Input
                      id="websiteUrl"
                      name="websiteUrl"
                      type="url"
                      placeholder="https://"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plan">Plan</Label>
                    <Input id="plan" name="plan" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Input
                      id="status"
                      name="status"
                      defaultValue="onboarding"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goLiveDate">Go-live target</Label>
                  <Input id="goLiveDate" name="goLiveDate" type="date" />
                </div>
                <Button type="submit" className="w-full">
                  Create client
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
