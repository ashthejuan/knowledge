import { cn } from "@/lib/utils";

export function WorkspacePage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "container mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:gap-10 sm:px-8 sm:py-14 lg:px-10",
        className
      )}
    >
      {children}
    </div>
  );
}

export function WorkspacePageHeader({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border border-white/70 bg-white/45 p-8 shadow-2xl shadow-[#315b40]/10 backdrop-blur-xl sm:gap-5 sm:p-10",
        className
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b46533]">
        {eyebrow}
      </p>
      <h1 className="font-heading text-4xl font-semibold tracking-[-0.06em] text-[#162017] sm:text-5xl">
        {title}
      </h1>
      <p className="max-w-2xl text-sm leading-7 text-[#4f5a50] sm:text-base">
        {description}
      </p>
    </header>
  );
}

export function WorkspaceSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-6 sm:gap-8", className)}>
      {children}
    </section>
  );
}
