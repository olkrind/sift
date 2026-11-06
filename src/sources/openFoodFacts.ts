import type { NutriScore, Product, Source } from './types.ts'

const FIELDS = [
  'product_name',
  'brands',
  'quantity',
  'image_url',
  'ingredients_text',
  'ingredients_text_ru',
  'ingredients_text_sr',
  'ingredients_text_en',
  'nutriscore_grade',
  'misc_tags',
  'nova_group',
  'labels_tags',
  'additives_original_tags',
  'allergens_tags',
  'nutriments',
].join(',')

const ALLERGENS: Record<string, string> = {
  celery: 'сельдерей',
  crustaceans: 'ракообразные',
  eggs: 'яйца',
  fish: 'рыба',
  gluten: 'глютен',
  lupin: 'люпин',
  milk: 'молоко',
  molluscs: 'моллюски',
  mustard: 'горчица',
  nuts: 'орехи',
  peanuts: 'арахис',
  'sesame-seeds': 'кунжут',
  soybeans: 'соя',
  'sulphur-dioxide-and-sulphites': 'сульфиты',
}

// Клетчатка в списке отсутствует: метка en:nutriscore-missing-fiber бывает и у рассчитанных оценок
const SCORE_REQUIREMENTS: Record<string, string> = {
  'en:nutriscore-missing-category': 'категория',
  'en:nutriscore-missing-nutrition-data-energy': 'калорийность',
  'en:nutriscore-missing-nutrition-data-proteins': 'белки',
  'en:nutriscore-missing-nutrition-data-salt': 'соль',
  'en:nutriscore-missing-nutrition-data-saturated-fat': 'насыщенные жиры',
  'en:nutriscore-missing-nutrition-data-sodium': 'соль',
  'en:nutriscore-missing-nutrition-data-sugars': 'сахара',
}

const KJ_PER_KCAL = 4.184

type OffProduct = {
  product_name?: string
  brands?: string
  quantity?: string
  image_url?: string
  ingredients_text?: string
  ingredients_text_ru?: string
  ingredients_text_sr?: string
  ingredients_text_en?: string
  nutriscore_grade?: string
  misc_tags?: string[]
  nova_group?: number
  labels_tags?: string[]
  additives_original_tags?: string[]
  allergens_tags?: string[]
  nutriments?: Record<string, number | string | undefined>
}

function untag(tag: string): string {
  return tag.slice(tag.indexOf(':') + 1)
}

function nutrient(nutriments: OffProduct['nutriments'], key: string): number | undefined {
  const value = nutriments?.[`${key}_100g`]
  return typeof value === 'number' ? value : undefined
}

// У части карточек энергия указана только в кДж
function energyKcal(nutriments: OffProduct['nutriments']): number | undefined {
  const kilojoules = nutrient(nutriments, 'energy-kj') ?? nutrient(nutriments, 'energy')
  return nutrient(nutriments, 'energy-kcal') ?? (kilojoules === undefined ? undefined : kilojoules / KJ_PER_KCAL)
}

function missingForScore(tags: string[] = []): string[] {
  return [...new Set(tags.flatMap((tag) => SCORE_REQUIREMENTS[tag] ?? []))]
}

function toProduct(code: string, raw: OffProduct): Product {
  const grade = raw.nutriscore_grade
  const hasGrade = grade !== undefined && grade.length === 1 && 'abcde'.includes(grade)
  const ingredients =
    raw.ingredients_text_ru || raw.ingredients_text_sr || raw.ingredients_text_en || raw.ingredients_text

  return {
    name: raw.product_name || undefined,
    brand: raw.brands || undefined,
    quantity: raw.quantity || undefined,
    imageUrl: raw.image_url,
    url: `https://world.openfoodfacts.org/product/${code}`,
    // Подчёркивания в тексте — разметка аллергенов в Open Food Facts
    ingredients: ingredients?.replaceAll('_', ''),
    // Также приходят значения unknown и not-applicable
    nutriScore: hasGrade ? (grade as NutriScore) : undefined,
    nutriScoreNotApplicable: grade === 'not-applicable' || undefined,
    nutriScoreMissing: hasGrade ? undefined : missingForScore(raw.misc_tags),
    nova: raw.nova_group,
    organic: raw.labels_tags?.some((tag) => tag === 'en:organic' || tag === 'en:eu-organic'),
    additives: raw.additives_original_tags?.map((tag) => {
      const name = untag(tag)
      return name[0].toUpperCase() + name.slice(1)
    }),
    allergens: raw.allergens_tags?.map((tag) => ALLERGENS[untag(tag)] ?? untag(tag)),
    nutrients: raw.nutriments && {
      energyKcal: energyKcal(raw.nutriments),
      fat: nutrient(raw.nutriments, 'fat'),
      saturatedFat: nutrient(raw.nutriments, 'saturated-fat'),
      carbohydrates: nutrient(raw.nutriments, 'carbohydrates'),
      sugars: nutrient(raw.nutriments, 'sugars'),
      fiber: nutrient(raw.nutriments, 'fiber'),
      protein: nutrient(raw.nutriments, 'proteins'),
      salt: nutrient(raw.nutriments, 'salt'),
    },
  }
}

export const openFoodFacts: Source = {
  id: 'off',
  name: 'Open Food Facts',
  async find(code, signal) {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS}`,
      {
        signal,
        // Браузер не даёт задать User-Agent; этот заголовок разрешён в CORS-ответе API
        headers: { 'X-User-Agent': 'Sift/0.1 (https://github.com/olkrind/sift)' },
      },
    )
    if (response.status === 404) return undefined
    if (!response.ok) throw new Error(`Open Food Facts: HTTP ${response.status}`)
    const data: { status: number; product?: OffProduct } = await response.json()
    return data.status === 1 && data.product ? toProduct(code, data.product) : undefined
  },
}
