export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-10">
      <h1 className="text-[22px] font-semibold tracking-tight text-zinc-50">
        {title}
      </h1>
      {description && (
        <p className="mt-1.5 text-[13px] text-zinc-500">{description}</p>
      )}
    </div>
  );
}
