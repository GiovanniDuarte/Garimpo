export function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[900px] px-6 py-8 sm:px-10 sm:pb-14 sm:pt-8">
      {children}
    </div>
  )
}
