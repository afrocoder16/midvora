"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const uuidSchema = z.string().uuid("Enter a valid UUID.");
const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

function emptyToNull(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? null : value;
}

const optionalText = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.string().trim().max(max, `Must be ${max} characters or fewer.`).nullable()
  );

const optionalEmail = z.preprocess(
  emptyToNull,
  z.string().trim().email("Enter a valid email address.").max(254).nullable()
);

const httpUrl = z
  .string()
  .trim()
  .url("Enter a complete URL, including https://.")
  .max(500)
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "Only http:// and https:// URLs are allowed.");

const optionalUrl = z.preprocess(emptyToNull, httpUrl.nullable());

function isValidDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .refine(isValidDate, "Enter a valid date.");

const optionalDate = z.preprocess(emptyToNull, dateOnly.nullable());

const newClientSchema = z.object({
  businessName: requiredText("Business name", 160),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required.")
    .max(80, "Slug must be 80 characters or fewer.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must use lowercase letters, numbers, and single hyphens only."
    ),
  contactName: optionalText(160),
  contactEmail: optionalEmail,
  contactPhone: optionalText(50),
  websiteUrl: optionalUrl,
  plan: optionalText(100),
  status: optionalText(100),
  goLiveDate: optionalDate,
});

const updateClientSchema = newClientSchema
  .omit({ businessName: true, slug: true })
  .extend({ clientId: uuidSchema });

const addTaskSchema = z.object({
  clientId: uuidSchema,
  title: requiredText("Task title", 200),
  description: optionalText(2000),
  dueDate: optionalDate,
});

const taskMutationSchema = z.object({
  clientId: uuidSchema,
  taskId: uuidSchema,
});

const toggleTaskSchema = taskMutationSchema.extend({
  nextStatus: z.enum(["todo", "done"]),
});

const addMeetingSchema = z.object({
  clientId: uuidSchema,
  title: requiredText("Meeting title", 200),
  scheduledAt: z
    .string()
    .min(1, "Meeting date and time are required.")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date and time."),
  meetingUrl: optionalUrl,
  notes: optionalText(4000),
});

const meetingMutationSchema = z.object({
  clientId: uuidSchema,
  meetingId: uuidSchema,
});

const monthOnly = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Choose a reporting month.")
  .refine((value) => isValidDate(`${value}-01`), "Choose a valid reporting month.")
  .transform((value) => `${value}-01`);

const metricsSchema = z.object({
  clientId: uuidSchema,
  periodMonth: monthOnly,
  siteVisits: z.coerce.number().int().min(0).max(1_000_000_000),
  callsFromSite: z.coerce.number().int().min(0).max(1_000_000_000),
  seoRankChange: z.coerce.number().int().min(-1_000_000).max(1_000_000),
  newReviews: z.coerce.number().int().min(0).max(1_000_000_000),
});

const assetMutationSchema = z.object({
  clientId: uuidSchema,
  assetId: uuidSchema,
});

const linkProfileSchema = z.object({
  clientId: uuidSchema,
  userId: uuidSchema,
});

const dashboardSectionSchema = z.object({
  clientId: uuidSchema,
  sectionKey: z.enum(["overview", "tasks", "assets", "meetings", "metrics"]),
});

const dashboardSectionLabels: Record<
  z.infer<typeof dashboardSectionSchema>["sectionKey"],
  string
> = {
  overview: "Project overview",
  tasks: "Tasks",
  assets: "Resources and assets",
  meetings: "Upcoming meetings",
  metrics: "This month at a glance",
};

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message || "Check the form and try again.";
}

function messageRedirect(
  path: string,
  kind: "error" | "success",
  message: string
): never {
  const params = new URLSearchParams({ [kind]: message });
  redirect(`${path}?${params.toString()}`);
}

function clientPath(value: FormDataEntryValue | null) {
  const parsed = uuidSchema.safeParse(value);
  return parsed.success ? `/admin/clients/${parsed.data}` : "/admin";
}

function clientError(formData: FormData, message: string): never {
  messageRedirect(clientPath(formData.get("clientId")), "error", message);
}

function clientSuccess(clientId: string, message: string): never {
  messageRedirect(`/admin/clients/${clientId}`, "success", message);
}

function revalidateClient(clientId: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/clients/${clientId}`);
}

function safeFileName(name: string) {
  const finalSegment = name.split(/[\\/]/).pop() || "asset";
  const cleaned = finalSegment
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);

  return cleaned || "asset";
}

export async function createClientAction(formData: FormData) {
  await requireAdmin();

  const parsed = newClientSchema.safeParse({
    businessName: formData.get("businessName"),
    slug: formData.get("slug"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    websiteUrl: formData.get("websiteUrl"),
    plan: formData.get("plan"),
    status: formData.get("status"),
    goLiveDate: formData.get("goLiveDate"),
  });

  if (!parsed.success) {
    messageRedirect("/admin", "error", firstIssue(parsed.error));
  }

  const data = parsed.data;
  const admin = createAdminClient();
  const { error } = await admin.from("clients").insert({
    business_name: data.businessName,
    slug: data.slug,
    contact_name: data.contactName,
    contact_email: data.contactEmail,
    contact_phone: data.contactPhone,
    website_url: data.websiteUrl,
    plan: data.plan,
    status: data.status || "onboarding",
    go_live_date: data.goLiveDate,
  });

  if (error) {
    messageRedirect(
      "/admin",
      "error",
      error.code === "23505"
        ? "That slug is already in use. Choose another slug."
        : "The client could not be created. Please try again."
    );
  }

  revalidatePath("/admin");
  messageRedirect("/admin", "success", "Client created.");
}

export async function toggleDashboardSectionAction(formData: FormData) {
  await requireAdmin();

  const parsed = dashboardSectionSchema.safeParse({
    clientId: formData.get("clientId"),
    sectionKey: formData.get("sectionKey"),
  });

  if (!parsed.success) {
    clientError(formData, firstIssue(parsed.error));
  }

  const data = parsed.data;
  const admin = createAdminClient();
  const { data: client, error: lookupError } = await admin
    .from("clients")
    .select("hidden_dashboard_sections")
    .eq("id", data.clientId)
    .maybeSingle();

  if (lookupError || !client) {
    clientError(formData, "The client visibility settings could not be loaded.");
  }

  const hiddenSections = new Set<string>(
    Array.isArray(client.hidden_dashboard_sections)
      ? client.hidden_dashboard_sections
      : []
  );
  const wasHidden = hiddenSections.has(data.sectionKey);

  if (wasHidden) {
    hiddenSections.delete(data.sectionKey);
  } else {
    hiddenSections.add(data.sectionKey);
  }

  const { error: updateError } = await admin
    .from("clients")
    .update({ hidden_dashboard_sections: [...hiddenSections] })
    .eq("id", data.clientId);

  if (updateError) {
    clientError(formData, "The dashboard visibility setting could not be saved.");
  }

  revalidateClient(data.clientId);
  revalidatePath("/dashboard");
  clientSuccess(
    data.clientId,
    `${dashboardSectionLabels[data.sectionKey]} ${wasHidden ? "restored" : "removed from the client dashboard"}.`
  );
}

export async function updateClientAction(formData: FormData) {
  await requireAdmin();

  const parsed = updateClientSchema.safeParse({
    clientId: formData.get("clientId"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    websiteUrl: formData.get("websiteUrl"),
    plan: formData.get("plan"),
    status: formData.get("status"),
    goLiveDate: formData.get("goLiveDate"),
  });

  if (!parsed.success) {
    clientError(formData, firstIssue(parsed.error));
  }

  const data = parsed.data;
  const admin = createAdminClient();
  const { error } = await admin
    .from("clients")
    .update({
      contact_name: data.contactName,
      contact_email: data.contactEmail,
      contact_phone: data.contactPhone,
      website_url: data.websiteUrl,
      plan: data.plan,
      status: data.status,
      go_live_date: data.goLiveDate,
    })
    .eq("id", data.clientId);

  if (error) {
    clientError(formData, "The client details could not be updated.");
  }

  revalidateClient(data.clientId);
  clientSuccess(data.clientId, "Client details updated.");
}

export async function addTaskAction(formData: FormData) {
  await requireAdmin();

  const parsed = addTaskSchema.safeParse({
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    description: formData.get("description"),
    dueDate: formData.get("dueDate"),
  });

  if (!parsed.success) {
    clientError(formData, firstIssue(parsed.error));
  }

  const data = parsed.data;
  const { error } = await createAdminClient().from("tasks").insert({
    client_id: data.clientId,
    title: data.title,
    description: data.description,
    due_date: data.dueDate,
    status: "todo",
  });

  if (error) {
    clientError(formData, "The task could not be added.");
  }

  revalidateClient(data.clientId);
  clientSuccess(data.clientId, "Task added.");
}

export async function toggleTaskAction(formData: FormData) {
  await requireAdmin();

  const parsed = toggleTaskSchema.safeParse({
    clientId: formData.get("clientId"),
    taskId: formData.get("taskId"),
    nextStatus: formData.get("nextStatus"),
  });

  if (!parsed.success) {
    clientError(formData, firstIssue(parsed.error));
  }

  const data = parsed.data;
  const { error } = await createAdminClient()
    .from("tasks")
    .update({ status: data.nextStatus })
    .eq("id", data.taskId)
    .eq("client_id", data.clientId);

  if (error) {
    clientError(formData, "The task status could not be changed.");
  }

  revalidateClient(data.clientId);
  clientSuccess(data.clientId, "Task status updated.");
}

export async function deleteTaskAction(formData: FormData) {
  await requireAdmin();

  const parsed = taskMutationSchema.safeParse({
    clientId: formData.get("clientId"),
    taskId: formData.get("taskId"),
  });

  if (!parsed.success) {
    clientError(formData, firstIssue(parsed.error));
  }

  const data = parsed.data;
  const { error } = await createAdminClient()
    .from("tasks")
    .delete()
    .eq("id", data.taskId)
    .eq("client_id", data.clientId);

  if (error) {
    clientError(formData, "The task could not be deleted.");
  }

  revalidateClient(data.clientId);
  clientSuccess(data.clientId, "Task deleted.");
}

export async function addMeetingAction(formData: FormData) {
  await requireAdmin();

  const parsed = addMeetingSchema.safeParse({
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    scheduledAt: formData.get("scheduledAt"),
    meetingUrl: formData.get("meetingUrl"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    clientError(formData, firstIssue(parsed.error));
  }

  const data = parsed.data;
  const { error } = await createAdminClient().from("meetings").insert({
    client_id: data.clientId,
    title: data.title,
    scheduled_at: new Date(data.scheduledAt).toISOString(),
    meeting_url: data.meetingUrl,
    notes: data.notes,
  });

  if (error) {
    clientError(formData, "The meeting could not be added.");
  }

  revalidateClient(data.clientId);
  clientSuccess(data.clientId, "Meeting added.");
}

export async function deleteMeetingAction(formData: FormData) {
  await requireAdmin();

  const parsed = meetingMutationSchema.safeParse({
    clientId: formData.get("clientId"),
    meetingId: formData.get("meetingId"),
  });

  if (!parsed.success) {
    clientError(formData, firstIssue(parsed.error));
  }

  const data = parsed.data;
  const { error } = await createAdminClient()
    .from("meetings")
    .delete()
    .eq("id", data.meetingId)
    .eq("client_id", data.clientId);

  if (error) {
    clientError(formData, "The meeting could not be deleted.");
  }

  revalidateClient(data.clientId);
  clientSuccess(data.clientId, "Meeting deleted.");
}

export async function upsertMetricsAction(formData: FormData) {
  await requireAdmin();

  const parsed = metricsSchema.safeParse({
    clientId: formData.get("clientId"),
    periodMonth: formData.get("periodMonth"),
    siteVisits: formData.get("siteVisits"),
    callsFromSite: formData.get("callsFromSite"),
    seoRankChange: formData.get("seoRankChange"),
    newReviews: formData.get("newReviews"),
  });

  if (!parsed.success) {
    clientError(formData, firstIssue(parsed.error));
  }

  const data = parsed.data;
  const { error } = await createAdminClient()
    .from("metrics")
    .upsert(
      {
        client_id: data.clientId,
        period_month: data.periodMonth,
        site_visits: data.siteVisits,
        calls_from_site: data.callsFromSite,
        seo_rank_change: data.seoRankChange,
        new_reviews: data.newReviews,
      },
      { onConflict: "client_id,period_month" }
    );

  if (error) {
    clientError(formData, "The monthly metrics could not be saved.");
  }

  revalidateClient(data.clientId);
  clientSuccess(data.clientId, "Monthly metrics saved.");
}

export async function uploadAssetAction(formData: FormData) {
  await requireAdmin();

  const baseParsed = z
    .object({
      clientId: uuidSchema,
      label: optionalText(200),
      type: optionalText(100),
    })
    .safeParse({
      clientId: formData.get("clientId"),
      label: formData.get("label"),
      type: formData.get("type"),
    });

  if (!baseParsed.success) {
    clientError(formData, firstIssue(baseParsed.error));
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    clientError(formData, "Choose a file to upload.");
  }

  if (file.size > MAX_FILE_SIZE) {
    clientError(formData, "Files must be 10 MB or smaller.");
  }

  const data = baseParsed.data;
  const storagePath = `${data.clientId}/${randomUUID()}-${safeFileName(file.name)}`;
  const admin = createAdminClient();
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from("client-assets")
    .upload(storagePath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    clientError(formData, "The file could not be uploaded.");
  }

  const { error: rowError } = await admin.from("assets").insert({
    client_id: data.clientId,
    label: data.label || file.name,
    type: data.type || file.type || null,
    storage_path: storagePath,
  });

  if (rowError) {
    await admin.storage.from("client-assets").remove([storagePath]);
    clientError(formData, "The asset record could not be saved.");
  }

  revalidateClient(data.clientId);
  clientSuccess(data.clientId, "Asset uploaded.");
}

export async function deleteAssetAction(formData: FormData) {
  await requireAdmin();

  const parsed = assetMutationSchema.safeParse({
    clientId: formData.get("clientId"),
    assetId: formData.get("assetId"),
  });

  if (!parsed.success) {
    clientError(formData, firstIssue(parsed.error));
  }

  const data = parsed.data;
  const admin = createAdminClient();
  const { data: asset, error: lookupError } = await admin
    .from("assets")
    .select("storage_path")
    .eq("id", data.assetId)
    .eq("client_id", data.clientId)
    .maybeSingle();

  if (lookupError || !asset) {
    clientError(formData, "The asset could not be found.");
  }

  if (asset.storage_path) {
    if (!asset.storage_path.startsWith(`${data.clientId}/`)) {
      clientError(formData, "The stored file path is outside this client folder.");
    }

    const { error: storageError } = await admin.storage
      .from("client-assets")
      .remove([asset.storage_path]);

    if (storageError) {
      clientError(formData, "The stored file could not be deleted.");
    }
  }

  const { error: rowError } = await admin
    .from("assets")
    .delete()
    .eq("id", data.assetId)
    .eq("client_id", data.clientId);

  if (rowError) {
    clientError(formData, "The asset record could not be deleted.");
  }

  revalidateClient(data.clientId);
  clientSuccess(data.clientId, "Asset deleted.");
}

export async function linkExistingAuthUserAction(formData: FormData) {
  const current = await requireAdmin();

  const parsed = linkProfileSchema.safeParse({
    clientId: formData.get("clientId"),
    userId: formData.get("userId"),
  });

  if (!parsed.success) {
    clientError(formData, firstIssue(parsed.error));
  }

  const data = parsed.data;
  if (data.userId === current.user.id) {
    clientError(formData, "You cannot link your current admin account as a client.");
  }

  const { error } = await createAdminClient().from("profiles").upsert(
    {
      id: data.userId,
      role: "client",
      client_id: data.clientId,
    },
    { onConflict: "id" }
  );

  if (error) {
    clientError(
      formData,
      error.code === "23503"
        ? "That UID does not match an existing Supabase Auth user."
        : "The Auth user could not be linked."
    );
  }

  revalidateClient(data.clientId);
  clientSuccess(data.clientId, "Auth user linked to this client.");
}
