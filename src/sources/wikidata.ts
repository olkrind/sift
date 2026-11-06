import type { Source } from './types.ts'

type Binding = {
  item: { value: string }
  itemLabel?: { value: string }
}

export const wikidata: Source = {
  id: 'wikidata',
  name: 'Wikidata',
  namesOnly: true,
  async find(code, signal) {
    // GTIN в Wikidata записаны и с ведущими нулями, и без них
    const variants = [code, code.padStart(14, '0')].map((value) => `"${value}"`).join(' ')
    const query = `SELECT ?item ?itemLabel WHERE {
      VALUES ?gtin { ${variants} }
      ?item wdt:P3962 ?gtin .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "sr,en,ru". }
    } LIMIT 1`

    const response = await fetch(
      `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`,
      {
        signal,
        headers: { 'Api-User-Agent': 'Sift/0.1 (https://github.com/olkrind/sift)' },
      },
    )
    if (!response.ok) throw new Error(`Wikidata: HTTP ${response.status}`)
    const data: { results: { bindings: Binding[] } } = await response.json()

    const match = data.results.bindings[0]
    return match && { name: match.itemLabel?.value, url: match.item.value }
  },
}
