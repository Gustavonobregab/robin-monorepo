'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { Loader2, Users } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { RetryCard } from '@/app/components/ui/RetryCard'
import { SearchInput } from '@/app/components/ui/SearchInput'
import { Skeleton } from '@/app/components/ui/Skeleton'
import { getAdminUsers } from '@/app/http/admin'
import { cn, formatDate, timeAgo } from '@/app/lib/utils'
import { UserDetailModal } from './UserDetailModal'

const PAGE_SIZE = 20

export function AdminUsersTable() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(query.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    `admin/users?search=${search}&page=${page}`,
    () => getAdminUsers({ search: search || undefined, page, limit: PAGE_SIZE }),
    { keepPreviousData: true },
  )

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[0.9375rem] font-medium text-foreground">Users</h2>
        <SearchInput
          placeholder="Search by name or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-xs"
        />
      </div>

      {error ? (
        <RetryCard message="Could not load users." onRetry={() => mutate()} />
      ) : isLoading || !data ? (
        <TableSkeleton />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title={search ? 'No users match this search' : 'No users yet'}
          hint={search ? 'Try a different name or email.' : undefined}
        />
      ) : (
        <>
          <div className={cn('overflow-x-auto', isValidating && 'opacity-60')}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[13px] text-muted-foreground">
                  <th className="pb-2 pr-4 font-normal">User</th>
                  <th className="pb-2 pr-4 font-normal">Plan</th>
                  <th className="pb-2 pr-4 text-right font-normal">Credits</th>
                  <th className="hidden pb-2 pr-4 font-normal md:table-cell">Joined</th>
                  <th className="hidden pb-2 font-normal md:table-cell">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => setSelectedId(user.id)}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-muted"
                  >
                    <td className="max-w-[16rem] py-3 pr-4">
                      <p className="truncate font-medium text-foreground">{user.name}</p>
                      <p className="truncate text-[13px] text-muted-foreground">{user.email}</p>
                    </td>
                    <td className="py-3 pr-4">
                      {user.planName && (
                        <>
                          <p className="text-foreground">{user.planName}</p>
                          {user.subscriptionStatus && user.subscriptionStatus !== 'active' && (
                            <p className="text-xs text-muted-foreground">
                              {user.subscriptionStatus}
                            </p>
                          )}
                        </>
                      )}
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-right text-foreground">
                      {user.creditsLimit > 0 && (
                        <>
                          {user.creditsUsed.toLocaleString()}
                          <span className="text-muted-foreground">
                            {' '}
                            of {user.creditsLimit.toLocaleString()}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="hidden whitespace-nowrap py-3 pr-4 text-muted-foreground md:table-cell">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="hidden whitespace-nowrap py-3 text-muted-foreground md:table-cell">
                      {user.lastActivityAt ? timeAgo(user.lastActivityAt) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={data.total}
            busy={isValidating}
            onPage={setPage}
          />
        </>
      )}

      <UserDetailModal userId={selectedId} onClose={() => setSelectedId(null)} />
    </Card>
  )
}

export function Pagination({
  page,
  totalPages,
  total,
  busy,
  onPage,
}: {
  page: number
  totalPages: number
  total: number
  busy?: boolean
  onPage: (page: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
      <p className="text-[13px] text-muted-foreground">
        Page {page} of {totalPages}, {total.toLocaleString()} total
      </p>
      <div className="flex items-center gap-2">
        {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-0.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-t border-border py-3 first:border-t-0">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-52" />
          </div>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="hidden h-3 w-24 md:block" />
          <Skeleton className="hidden h-3 w-20 md:block" />
        </div>
      ))}
    </div>
  )
}
