const VALID_LENGTHS = [8, 12, 13, 14]

export function isValidBarcode(code: string): boolean {
  if (!/^\d+$/.test(code) || !VALID_LENGTHS.includes(code.length)) return false
  const digits = [...code].map(Number)
  const check = digits.pop()!
  const sum = digits
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === check
}

// UPC-A и EAN-13 с ведущим нулём — один код: без приведения повторный скан считается новым продуктом
export function normalizeBarcode(code: string): string {
  return code.length === 12 ? `0${code}` : code
}

export function isUsPrefix(code: string): boolean {
  return Number(code.padStart(13, '0').slice(0, 3)) < 140
}
