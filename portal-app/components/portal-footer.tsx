import { MidvoraBrand } from "@/components/midvora-brand";

type PortalFooterProps = {
  context: "Client portal" | "Admin portal";
};

export function PortalFooter({ context }: PortalFooterProps) {
  return (
    <footer className="mt-auto bg-brand-navy text-white">
      <div className="h-px bg-gradient-to-r from-brand-blue via-brand-blue to-brand-orange" />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <MidvoraBrand theme="dark" label={context} />
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/55">
            Thoughtful digital experiences, built in the Midwest for the world.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-white/45 sm:text-right">
          <span>{context}</span>
          <span className="size-1 rounded-full bg-brand-orange" aria-hidden="true" />
          <span>&copy; {new Date().getFullYear()} Midvora</span>
        </div>
      </div>
    </footer>
  );
}
