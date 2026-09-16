export function PageTitle({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="mb-6 animate-fade-up">
      <h1 className="text-[1.65rem] font-bold tracking-tight text-foreground sm:text-[1.85rem]">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  )
}
