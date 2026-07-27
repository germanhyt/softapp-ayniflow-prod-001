export function AuthSessionSkeleton() {
  return (
    <div className="app-shell flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="mx-auto skeleton h-10 w-10 rounded-xl" />
        <div className="skeleton mx-auto h-5 w-40" />
        <div className="skeleton mx-auto h-4 w-56" />
        <div className="space-y-2 pt-2">
          <div className="skeleton h-10 w-full rounded-lg" />
          <div className="skeleton h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export function AppShellSkeleton() {
  return (
    <div className="app-shell flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r p-4 lg:block" style={{ borderColor: 'var(--premium-border)' }}>
        <div className="skeleton mb-6 h-9 w-36" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-9 w-full rounded-lg" />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex h-14 items-center justify-between border-b px-4 lg:px-6"
          style={{ borderColor: 'var(--premium-border)' }}
        >
          <div className="skeleton h-8 w-8 rounded-lg lg:hidden" />
          <div className="skeleton h-4 w-28" />
          <div className="flex gap-2">
            <div className="skeleton h-9 w-9 rounded-lg" />
            <div className="skeleton h-9 w-9 rounded-lg" />
          </div>
        </header>
        <main className="flex-1 space-y-4 p-4 lg:p-6">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-4 w-72 max-w-full" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="stat-summary space-y-3">
                <div className="skeleton h-3 w-20" />
                <div className="skeleton h-7 w-28" />
              </div>
            ))}
          </div>
          <div className="card space-y-3">
            <div className="skeleton h-4 w-full max-w-md" />
            <div className="skeleton h-4 w-full max-w-sm" />
            <div className="skeleton h-4 w-full max-w-xs" />
          </div>
        </main>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="table-shell space-y-0 p-4">
      <div className="skeleton mb-4 h-4 w-full max-w-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton mb-2 h-10 w-full rounded-lg" />
      ))}
    </div>
  )
}
