interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#1e2a44] px-6 py-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-white">{title}</h1>
        {description ? <p className="mt-0.5 text-sm text-[#8b99b5]">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
