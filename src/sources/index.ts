import { openFoodFacts } from './openFoodFacts.ts'
import type { Product, Source, SourceResult } from './types.ts'
import { usda } from './usda.ts'
import { wikidata } from './wikidata.ts'

// Порядок задаёт приоритет при объединении полей
export const sources: Source[] = [openFoodFacts, usda, wikidata]

const TIMEOUT_MS = 10_000

async function ask(source: Source, code: string): Promise<SourceResult> {
  const { id, name } = source
  if (source.covers && !source.covers(code)) return { id, name, status: 'skipped' }
  try {
    const product = await source.find(code, AbortSignal.timeout(TIMEOUT_MS))
    return { id, name, status: product ? 'found' : 'not_found', product }
  } catch {
    return { id, name, status: 'error' }
  }
}

function hasValue(value: unknown): boolean {
  return Array.isArray(value) ? value.length > 0 : value !== undefined
}

function fillMissing<T extends object>(base: T, extra: T): T {
  const result = { ...base } as Record<string, unknown>
  for (const [key, value] of Object.entries(extra)) {
    if (!hasValue(result[key])) result[key] = value
  }
  return result as T
}

function mergeProducts(products: Product[]): Product | undefined {
  if (products.length === 0) return undefined
  return products.reduce((merged, product) => ({
    ...fillMissing(merged, product),
    nutrients: fillMissing(merged.nutrients ?? {}, product.nutrients ?? {}),
  }))
}

export async function lookup(code: string) {
  const results = await Promise.all(sources.map((source) => ask(source, code)))
  const products = results.flatMap((result) => result.product ?? [])
  const unavailable = results.some(
    (result) => result.status === 'error' && !sources.find((source) => source.id === result.id)?.namesOnly,
  )
  return { results, product: mergeProducts(products), unavailable }
}

export type LookupResult = Awaited<ReturnType<typeof lookup>>
