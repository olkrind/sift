import { useState } from 'react'
import type { CoverageEntry, CoverageLevel } from '../coverage.ts'

const LEVEL_LABELS: Record<CoverageLevel, string> = {
  full: 'полные',
  partial: 'неполные',
  missing: 'не найден',
  error: 'ошибка',
}

function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100)
}

function toText(entries: CoverageEntry[]): string {
  return entries
    .map(({ code, name, level, foundIn }) => [code, level, name ?? '', foundIn.join('+')].join('\t'))
    .join('\n')
}

type Props = {
  entries: CoverageEntry[]
  onClear: () => void
}

export function Coverage({ entries, onClear }: Props) {
  const [copied, setCopied] = useState(false)
  if (entries.length === 0) return null

  const checked = entries.filter((entry) => entry.level !== 'error')
  const full = checked.filter((entry) => entry.level === 'full').length
  const hits = new Map<string, number>()
  for (const name of entries.flatMap((entry) => entry.foundIn)) {
    hits.set(name, (hits.get(name) ?? 0) + 1)
  }

  async function copy() {
    await navigator.clipboard.writeText(toText(entries))
    setCopied(true)
  }

  return (
    <details className="card coverage">
      <summary>
        <span>Покрытие</span>
        <span className="muted">
          {full} из {checked.length} полных, {percent(full, checked.length)}%
        </span>
      </summary>

      <ul className="sources">
        {[...hits].map(([name, count]) => (
          <li key={name}>
            <span>{name}</span>
            <span>{count}</span>
          </li>
        ))}
      </ul>

      <ol className="history">
        {entries.map(({ code, name, level }) => (
          <li key={code}>
            <span>{name ?? code}</span>
            <span className={`level level-${level}`}>{LEVEL_LABELS[level]}</span>
          </li>
        ))}
      </ol>

      <div className="row">
        <button type="button" className="button-quiet" onClick={() => void copy()}>
          {copied ? 'Скопировано' : 'Скопировать'}
        </button>
        <button type="button" className="button-quiet" onClick={onClear}>
          Очистить
        </button>
      </div>
    </details>
  )
}
