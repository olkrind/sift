import type { SourceResult, SourceStatus } from '../sources/types.ts'

const STATUS_LABELS: Record<SourceStatus, string> = {
  found: 'найден',
  not_found: 'нет',
  error: 'ошибка',
  skipped: 'не запрашивался',
}

export function SourceList({ results }: { results: SourceResult[] }) {
  return (
    <ul className="sources">
      {results.map(({ id, name, status }) => (
        <li key={id}>
          <span>{name}</span>
          <span className={`status status-${status}`}>{STATUS_LABELS[status]}</span>
        </li>
      ))}
    </ul>
  )
}
