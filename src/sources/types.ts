export type NutriScore = 'a' | 'b' | 'c' | 'd' | 'e'

export type Nutrients = {
  energyKcal?: number
  fat?: number
  saturatedFat?: number
  carbohydrates?: number
  sugars?: number
  fiber?: number
  protein?: number
  salt?: number
}

export type Product = {
  name?: string
  brand?: string
  quantity?: string
  imageUrl?: string
  url?: string
  ingredients?: string
  nutriScore?: NutriScore
  // Вода, алкоголь и другие группы, для которых формула Nutri-Score не предусмотрена
  nutriScoreNotApplicable?: boolean
  // Данные, без которых база не рассчитала Nutri-Score
  nutriScoreMissing?: string[]
  nova?: number
  organic?: boolean
  additives?: string[]
  allergens?: string[]
  nutrients?: Nutrients
}

export type Source = {
  id: string
  name: string
  // Источник без состава: его сбой не означает, что данные о продукте могли быть получены
  namesOnly?: boolean
  // Источник с лимитами не вызывается для кодов, которых в нём заведомо нет
  covers?: (code: string) => boolean
  // undefined — продукта в базе нет; сетевая ошибка и лимит передаются исключением
  find: (code: string, signal: AbortSignal) => Promise<Product | undefined>
}

export type SourceStatus = 'found' | 'not_found' | 'error' | 'skipped'

export type SourceResult = {
  id: string
  name: string
  status: SourceStatus
  product?: Product
}
