import { isUsPrefix } from '../barcode.ts'
import type { Nutrients, Source } from './types.ts'

// DEMO_KEY ограничен запросами с одного IP в час и в сутки, поэтому вызов только для кодов США и Канады
const API_KEY = 'DEMO_KEY'

type UsdaFood = {
  fdcId: number
  gtinUpc?: string
  description?: string
  brandName?: string
  brandOwner?: string
  packageWeight?: string
  ingredients?: string
  foodNutrients?: { nutrientNumber?: string; value?: number }[]
}

function toNutrients(food: UsdaFood): Nutrients {
  const value = (number: string) =>
    food.foodNutrients?.find((nutrient) => nutrient.nutrientNumber === number)?.value
  const sodiumMg = value('307')

  return {
    energyKcal: value('208'),
    fat: value('204'),
    saturatedFat: value('606'),
    carbohydrates: value('205'),
    sugars: value('269'),
    fiber: value('291'),
    protein: value('203'),
    salt: sodiumMg === undefined ? undefined : (sodiumMg * 2.5) / 1000,
  }
}

export const usda: Source = {
  id: 'usda',
  name: 'USDA FoodData Central',
  covers: isUsPrefix,
  async find(code, signal) {
    const upc = code.replace(/^0+/, '').padStart(12, '0')
    const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search')
    url.search = new URLSearchParams({
      api_key: API_KEY,
      query: `gtinUpc:${upc}`,
      dataType: 'Branded',
      pageSize: '5',
    }).toString()

    const response = await fetch(url, { signal })
    if (!response.ok) throw new Error(`USDA: HTTP ${response.status}`)
    const data: { foods?: UsdaFood[] } = await response.json()

    // Поиск полнотекстовый: без сравнения кода в результат попадает похожий продукт
    const food = data.foods?.find((item) => Number(item.gtinUpc) === Number(code))
    if (!food) return undefined
    return {
      name: food.description,
      brand: food.brandName ?? food.brandOwner,
      quantity: food.packageWeight,
      url: `https://fdc.nal.usda.gov/food-details/${food.fdcId}/nutrients`,
      ingredients: food.ingredients,
      nutrients: toNutrients(food),
    }
  },
}
