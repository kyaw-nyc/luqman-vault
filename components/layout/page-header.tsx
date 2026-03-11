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
          ? "mb-6 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between sm:gap-4"
          : "mb-6 sm:mb-10"
      }
    >
      <div className="min-w-0">
        <h1 className="text-[20px] font-semibold tracking-tight text-zinc-50 sm:text-[22px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-[12px] text-zinc-500 sm:mt-1.5 sm:text-[13px]">
            {description}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}
