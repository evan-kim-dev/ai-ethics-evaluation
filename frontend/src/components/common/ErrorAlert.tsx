export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="animate-pop whitespace-pre-wrap rounded-2xl bg-[#fff1f1] px-4 py-3 text-sm font-medium leading-relaxed text-[#b42318]">
      {message}
    </div>
  )
}
