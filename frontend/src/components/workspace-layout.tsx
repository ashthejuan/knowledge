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
        "container mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-6 py-8 lg:px-8",
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
    <header className={cn("flex flex-col gap-3", className)}>
      <p className="text-xs font-medium text-muted-foreground">{eyebrow}</p>
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h1>
      <p className="max-w-[720px] text-sm leading-6 text-muted-foreground sm:text-base">
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
    <section className={cn("flex flex-col gap-6", className)}>
      {children}
    </section>
  );
}
