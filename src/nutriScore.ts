import { detectProductType } from './productType.ts'
import type { ProductType } from './productType.ts'
import type { NutriScore, Nutrients, Product } from './sources/types.ts'

// Формулы Nutri-Score 2023; пороги совпадают с Nutriscore.pm в Open Food Facts.
// Доля фруктов и овощей неизвестна и считается нулевой, кроме соков.
const ENERGY_KJ = [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350]
const ENERGY_KJ_BEVERAGES = [30, 90, 150, 210, 240, 270, 300, 330, 360, 390]
const ENERGY_FROM_SATURATED_FAT_KJ = [120, 240, 360, 480, 600, 720, 840, 960, 1080, 1200]
const SUGARS = [3.4, 6.8, 10, 14, 17, 20, 24, 27, 31, 34, 37, 41, 44, 48, 51]
const SUGARS_BEVERAGES = [0.5, 2, 3.5, 5, 6, 7, 8, 9, 10, 11]
const SATURATED_FAT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const SATURATED_FAT_RATIO = [10, 16, 22, 28, 34, 40, 46, 52, 58, 64]
const SALT = [0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.8, 3, 3.2, 3.4, 3.6, 3.8, 4]
const FIBER = [3.0, 4.1, 5.2, 6.3, 7.4]
const PROTEINS = [2.4, 4.8, 7.2, 9.6, 12, 14, 17]
const PROTEINS_BEVERAGES = [1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0]

// Максимум для напитков: без него стопроцентный сок получает E из-за собственного сахара
const JUICE_FRUIT_POINTS = 6

const KJ_PER_KCAL = 4.184
const KJ_PER_GRAM_SATURATED_FAT = 37

const GRADE_LIMITS: Record<'beverage' | 'fat' | 'food', number[]> = {
  beverage: [-Infinity, 2, 6, 9],
  fat: [-6, 2, 10, 18],
  food: [0, 2, 10, 18],
}

type Formula = {
  negative: number
  // Сверх этого числа негативных баллов белок не учитывается
  proteinLimit: number
  proteins: number[]
  limits: number[]
}

export type NutriScoreEstimate = {
  grade: NutriScore
  type: Exclude<ProductType, 'excluded'>
}

function points(value: number, thresholds: number[]): number {
  return thresholds.filter((threshold) => value > threshold).length
}

function pointsInclusive(value: number, thresholds: number[]): number {
  return thresholds.filter((threshold) => value >= threshold).length
}

function formulaFor(type: ProductType, kilojoules: number, product: Nutrients): Formula | undefined {
  const sugars = product.sugars!
  const saturatedFat = product.saturatedFat!
  const salt = points(product.salt!, SALT)

  if (type === 'beverage' || type === 'juice') {
    return {
      negative: points(kilojoules, ENERGY_KJ_BEVERAGES) + points(sugars, SUGARS_BEVERAGES) + points(saturatedFat, SATURATED_FAT) + salt,
      proteinLimit: Infinity,
      proteins: PROTEINS_BEVERAGES,
      limits: GRADE_LIMITS.beverage,
    }
  }
  if (type === 'fat') {
    if (product.fat === undefined) return undefined
    const ratio = product.fat > 0 ? (saturatedFat / product.fat) * 100 : 0
    return {
      negative:
        points(saturatedFat * KJ_PER_GRAM_SATURATED_FAT, ENERGY_FROM_SATURATED_FAT_KJ) +
        points(sugars, SUGARS) +
        pointsInclusive(ratio, SATURATED_FAT_RATIO) +
        salt,
      proteinLimit: 7,
      proteins: PROTEINS,
      limits: GRADE_LIMITS.fat,
    }
  }
  return {
    negative: points(kilojoules, ENERGY_KJ) + points(sugars, SUGARS) + points(saturatedFat, SATURATED_FAT) + salt,
    proteinLimit: type === 'cheese' ? Infinity : 11,
    proteins: PROTEINS,
    limits: GRADE_LIMITS.food,
  }
}

function gradeFor(type: ProductType, nutrients: Nutrients): NutriScore | undefined {
  const { energyKcal, protein, fiber = 0 } = nutrients
  const formula = formulaFor(type, energyKcal! * KJ_PER_KCAL, nutrients)
  if (!formula) return undefined

  const proteinPoints = formula.negative < formula.proteinLimit ? points(protein!, formula.proteins) : 0
  const fruitPoints = type === 'juice' ? JUICE_FRUIT_POINTS : 0
  const total = formula.negative - points(fiber, FIBER) - proteinPoints - fruitPoints
  const grades: NutriScore[] = ['a', 'b', 'c', 'd']
  return grades.find((_, index) => total <= formula.limits[index]) ?? 'e'
}

export function estimateNutriScore(product: Product): NutriScoreEstimate | undefined {
  const type = detectProductType(product)
  if (type === 'excluded') return undefined
  if (type === 'water') return { grade: 'a', type }

  const { nutrients } = product
  if (!nutrients) return undefined
  const { energyKcal, sugars, saturatedFat, fat, carbohydrates, salt, protein } = nutrients
  if (energyKcal === undefined || salt === undefined || protein === undefined) return undefined

  // Насыщенных жиров не больше общего жира, сахаров не больше углеводов:
  // одинаковая буква на обеих границах верна при любом значении пропущенного поля
  const highSaturatedFat = saturatedFat ?? fat
  const highSugars = sugars ?? carbohydrates
  if (highSaturatedFat === undefined || highSugars === undefined) return undefined

  const lowest = gradeFor(type, { ...nutrients, saturatedFat: saturatedFat ?? 0, sugars: sugars ?? 0 })
  const highest = gradeFor(type, { ...nutrients, saturatedFat: highSaturatedFat, sugars: highSugars })
  return lowest && lowest === highest ? { grade: lowest, type } : undefined
}
