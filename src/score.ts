import { estimateNutriScore } from './nutriScore.ts'
import type { NutriScoreEstimate } from './nutriScore.ts'
import type { NutriScore, Product } from './sources/types.ts'

const NUTRI_POINTS: Record<NutriScore, number> = { a: 90, b: 75, c: 55, d: 35, e: 15 }
const NOVA_PENALTY: Record<number, number> = { 3: 5, 4: 15 }
const ADDITIVE_PENALTY = 2
const MAX_ADDITIVES_PENALTY = 10
const ORGANIC_BONUS = 5

export type Score = {
  value: number
  verdict: string
  tone: 'good' | 'fair' | 'poor' | 'bad'
  // Буква рассчитана в Sift: в базе Nutri-Score нет
  estimate?: NutriScoreEstimate
  factors: { label: string; points: number }[]
}

function verdictFor(value: number): Pick<Score, 'verdict' | 'tone'> {
  if (value >= 75) return { verdict: 'Хороший выбор', tone: 'good' }
  if (value >= 50) return { verdict: 'Средний выбор', tone: 'fair' }
  if (value >= 25) return { verdict: 'Лучше ограничить', tone: 'poor' }
  return { verdict: 'Плохой выбор', tone: 'bad' }
}

// Без буквы оценка не считается: добавки и обработка не описывают питательность
export function scoreProduct(product: Product): Score | undefined {
  const estimate = product.nutriScore || product.nutriScoreNotApplicable ? undefined : estimateNutriScore(product)
  const grade = product.nutriScore ?? estimate?.grade
  if (!grade) return undefined

  const gradeLabel = `Nutri-Score ${grade.toUpperCase()}${estimate ? ', приблизительно' : ''}`
  const factors = [{ label: gradeLabel, points: NUTRI_POINTS[grade] }]
  const novaPenalty = NOVA_PENALTY[product.nova ?? 0]
  if (novaPenalty) factors.push({ label: `Обработка NOVA ${product.nova}`, points: -novaPenalty })
  const additives = product.additives?.length ?? 0
  if (additives > 0) {
    factors.push({
      label: `Добавки, ${additives} шт.`,
      points: -Math.min(additives * ADDITIVE_PENALTY, MAX_ADDITIVES_PENALTY),
    })
  }
  if (product.organic) factors.push({ label: 'Органический продукт', points: ORGANIC_BONUS })

  const total = factors.reduce((sum, factor) => sum + factor.points, 0)
  const value = Math.min(100, Math.max(0, total))
  return { value, factors, estimate, ...verdictFor(value) }
}
