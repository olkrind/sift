import { useCallback, useState } from 'react'
import type { LookupResult } from './sources/index.ts'

const STORAGE_KEY = 'sift.coverage'

export type CoverageLevel = 'full' | 'partial' | 'missing' | 'error'

export type CoverageEntry = {
  code: string
  name?: string
  level: CoverageLevel
  foundIn: string[]
}

export function coverageLevel({ product, unavailable }: LookupResult): CoverageLevel {
  if (product?.ingredients && (product.nutriScore || product.nutrients?.energyKcal !== undefined)) return 'full'
  if (product) return 'partial'
  // Сбой сети не означает отсутствие продукта: иначе процент покрытия занижается
  return unavailable ? 'error' : 'missing'
}

function read(): CoverageEntry[] {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function write(entries: CoverageEntry[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Без хранилища счётчик работает до перезагрузки страницы
  }
}

export function useCoverage() {
  const [entries, setEntries] = useState(read)

  const record = useCallback((code: string, lookup: LookupResult) => {
    const entry: CoverageEntry = {
      code,
      name: lookup.product?.name,
      level: coverageLevel(lookup),
      foundIn: lookup.results.filter((result) => result.status === 'found').map((result) => result.name),
    }
    setEntries((current) => {
      const next = [entry, ...current.filter((item) => item.code !== code)]
      write(next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    write([])
    setEntries([])
  }, [])

  return { entries, record, clear }
}
