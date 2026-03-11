export function PageHeader({
  title,
  description,
  right,
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      className={
        right
          ? "mb-10 flex items-end justify-between gap-4"
          : "mb-10"
      }
    >
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-zinc-50">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-[13px] text-zinc-500">{description}</p>
        )}
      </div>
      {right}
    </div>
  );
}
