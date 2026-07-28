import { Eye, EyeOff } from "lucide-react";
import { toggleDashboardSectionAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export type DashboardSectionKey =
  | "overview"
  | "tasks"
  | "assets"
  | "meetings"
  | "metrics";

type SectionVisibilityButtonProps = {
  clientId: string;
  sectionKey: DashboardSectionKey;
  hidden: boolean;
};

export function SectionVisibilityButton({
  clientId,
  sectionKey,
  hidden,
}: SectionVisibilityButtonProps) {
  return (
    <form action={toggleDashboardSectionAction} className="shrink-0">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="sectionKey" value={sectionKey} />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        className={hidden ? "text-brand-blue" : "text-muted-foreground"}
      >
        {hidden ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
        {hidden ? "Restore" : "Remove"}
      </Button>
    </form>
  );
}
