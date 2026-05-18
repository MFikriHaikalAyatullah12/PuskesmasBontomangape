import * as XLSX from 'xlsx'

export interface ParsedMedicineData {
  name: string
  quantity: number
  date: Date
  month: number
  year: number
  unit?: string
  type?: string
  notes?: string
}

// Common column name variations for intelligent mapping
const COLUMN_MAPPINGS = {
  name: ['nama', 'name', 'nama obat', 'nama_obat', 'medicine', 'medicine_name', 'obat', 'item', 'product', 'produk'],
  quantity: ['jumlah', 'qty', 'quantity', 'stok', 'stock', 'total', 'amount', 'kuantitas', 'jml', 'jumlah_pemakaian', 'pemakaian'],
  date: ['tanggal', 'date', 'tgl', 'waktu', 'time', 'periode', 'period'],
  month: ['bulan', 'month', 'bln'],
  year: ['tahun', 'year', 'thn'],
  unit: ['satuan', 'unit', 'uom', 'kemasan'],
  type: ['tipe', 'type', 'jenis', 'kategori', 'category', 'keterangan'],
  notes: ['catatan', 'notes', 'note', 'keterangan', 'description', 'deskripsi']
}

const DEFAULT_UNIT = 'tablet'

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value

  const normalized = String(value)
    .replace(/[^0-9,.-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '')
}

function findMatchingColumn(headers: string[], targetKeys: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const normalized = normalizeColumnName(headers[i])
    for (const key of targetKeys) {
      if (normalized.includes(normalizeColumnName(key)) || normalizeColumnName(key).includes(normalized)) {
        return i
      }
    }
  }
  return -1
}

function findHeaderRow(rawRows: any[][]): number {
  const maxScan = Math.min(rawRows.length, 20)
  let bestIdx = 0
  let bestScore = -1

  const allKeywords = Object.values(COLUMN_MAPPINGS).flat().map(normalizeColumnName)

  for (let i = 0; i < maxScan; i++) {
    const row = rawRows[i] || []
    const cells = row.map(toStringValue)
    const nonEmptyCells = cells.filter(Boolean)
    if (nonEmptyCells.length < 2) continue

    let keywordHits = 0
    for (const cell of nonEmptyCells) {
      const normalized = normalizeColumnName(cell)
      if (!normalized) continue
      if (allKeywords.some(key => normalized.includes(key) || key.includes(normalized))) {
        keywordHits++
      }
    }

    const nextRows = rawRows.slice(i + 1, i + 6)
    let dataDensity = 0
    let dataRows = 0
    for (const nextRow of nextRows) {
      const filled = (nextRow || []).map(toStringValue).filter(Boolean).length
      if (filled > 0) {
        dataDensity += filled
        dataRows++
      }
    }

    const score = keywordHits * 10 + nonEmptyCells.length * 2 + (dataRows > 0 ? dataDensity / dataRows : 0)
    if (score > bestScore) {
      bestScore = score
      bestIdx = i
    }
  }

  return bestIdx
}

function parseDate(value: any): { date: Date; month: number; year: number } | null {
  if (!value) return null

  // If it's already a Date
  if (value instanceof Date) {
    return {
      date: value,
      month: value.getMonth() + 1,
      year: value.getFullYear()
    }
  }

  // If it's a number (Excel serial date)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      return {
        date: new Date(date.y, date.m - 1, date.d),
        month: date.m,
        year: date.y
      }
    }
  }

  // If it's a string
  if (typeof value === 'string') {
    // Try various date formats
    const datePatterns = [
      /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/, // DD-MM-YYYY or DD/MM/YYYY
      /(\d{2,4})[-/](\d{1,2})[-/](\d{1,2})/, // YYYY-MM-DD
      /(\d{1,2})\s+(\w+)\s+(\d{2,4})/i, // DD Month YYYY
    ]

    for (const pattern of datePatterns) {
      const match = value.match(pattern)
      if (match) {
        let day, month, year
        
        if (pattern === datePatterns[0]) {
          day = parseInt(match[1])
          month = parseInt(match[2])
          year = parseInt(match[3])
        } else if (pattern === datePatterns[1]) {
          year = parseInt(match[1])
          month = parseInt(match[2])
          day = parseInt(match[3])
        } else {
          day = parseInt(match[1])
          month = parseMonthName(match[2])
          year = parseInt(match[3])
        }

        if (year < 100) year += 2000
        
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return {
            date: new Date(year, month - 1, day),
            month,
            year
          }
        }
      }
    }

    // Try native parsing
    const parsed = new Date(value)
    if (!isNaN(parsed.getTime())) {
      return {
        date: parsed,
        month: parsed.getMonth() + 1,
        year: parsed.getFullYear()
      }
    }
  }

  return null
}

function parseMonthName(monthStr: string): number {
  const months: { [key: string]: number } = {
    'januari': 1, 'january': 1, 'jan': 1,
    'februari': 2, 'february': 2, 'feb': 2,
    'maret': 3, 'march': 3, 'mar': 3,
    'april': 4, 'apr': 4,
    'mei': 5, 'may': 5,
    'juni': 6, 'june': 6, 'jun': 6,
    'juli': 7, 'july': 7, 'jul': 7,
    'agustus': 8, 'august': 8, 'aug': 8, 'agu': 8,
    'september': 9, 'sep': 9, 'sept': 9,
    'oktober': 10, 'october': 10, 'oct': 10, 'okt': 10,
    'november': 11, 'nov': 11, 'nop': 11,
    'desember': 12, 'december': 12, 'dec': 12, 'des': 12
  }
  return months[monthStr.toLowerCase()] || 0
}

function parsePeriodFromHeader(header: string): { month: number; year: number } | null {
  const text = header.toLowerCase().trim()
  if (!text) return null

  const monthMatch = Object.keys({
    januari: 1, january: 1, jan: 1,
    februari: 2, february: 2, feb: 2,
    maret: 3, march: 3, mar: 3,
    april: 4, apr: 4,
    mei: 5, may: 5,
    juni: 6, june: 6, jun: 6,
    juli: 7, july: 7, jul: 7,
    agustus: 8, august: 8, aug: 8, agu: 8,
    september: 9, sep: 9, sept: 9,
    oktober: 10, october: 10, oct: 10, okt: 10,
    november: 11, nov: 11, nop: 11,
    desember: 12, december: 12, dec: 12, des: 12
  }).find(m => text.includes(m))

  const yearMatch = text.match(/(19|20)\d{2}/)
  if (!yearMatch) return null

  let month = monthMatch ? parseMonthName(monthMatch) : 0
  if (!month) {
    const monthNumber = text.match(/(^|\D)(1[0-2]|0?[1-9])(\D|$)/)
    if (monthNumber) {
      month = parseInt(monthNumber[2], 10)
    }
  }

  return month >= 1 && month <= 12
    ? { month, year: parseInt(yearMatch[0], 10) }
    : null
}

function detectNameColumn(headers: string[], rows: any[][]): number {
  const mappedIdx = findMatchingColumn(headers, COLUMN_MAPPINGS.name)
  if (mappedIdx !== -1) return mappedIdx

  let bestIdx = -1
  let bestScore = -1

  for (let col = 0; col < headers.length; col++) {
    let textCount = 0
    let uniqueText = new Set<string>()

    for (let r = 0; r < Math.min(rows.length, 200); r++) {
      const cell = toStringValue(rows[r]?.[col])
      if (!cell) continue
      const isMostlyText = parseNumber(cell) === null || /[a-zA-Z]/.test(cell)
      if (isMostlyText) {
        textCount++
        uniqueText.add(cell.toLowerCase())
      }
    }

    const score = textCount + uniqueText.size
    if (score > bestScore) {
      bestScore = score
      bestIdx = col
    }
  }

  return bestIdx
}

function detectNumericColumn(headers: string[], rows: any[][], excluded: Set<number>): number {
  const mappedIdx = findMatchingColumn(headers, COLUMN_MAPPINGS.quantity)
  if (mappedIdx !== -1 && !excluded.has(mappedIdx)) return mappedIdx

  let bestIdx = -1
  let bestNumericCount = -1

  for (let col = 0; col < headers.length; col++) {
    if (excluded.has(col)) continue

    let numericCount = 0
    for (let r = 0; r < Math.min(rows.length, 300); r++) {
      if (parseNumber(rows[r]?.[col]) !== null) numericCount++
    }

    if (numericCount > bestNumericCount) {
      bestNumericCount = numericCount
      bestIdx = col
    }
  }

  return bestIdx
}

function parseUsageSheet(
  sheet: XLSX.WorkSheet,
  sheetName: string,
  masterMap: Map<string, { category?: string; stock?: number; unit?: string }>
): { data: ParsedMedicineData[]; headers: string[]; errors: string[] } {
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null }) as any[][]
  const errors: string[] = []
  const data: ParsedMedicineData[] = []

  if (rawRows.length < 2) {
    return { data, headers: [], errors }
  }

  const headerRowIdx = findHeaderRow(rawRows)
  const headers = (rawRows[headerRowIdx] || []).map(toStringValue)
  const rows = rawRows.slice(headerRowIdx + 1)

  const nameIdx = detectNameColumn(headers, rows)
  const monthIdx = findMatchingColumn(headers, COLUMN_MAPPINGS.month)
  const yearIdx = findMatchingColumn(headers, COLUMN_MAPPINGS.year)
  const dateIdx = findMatchingColumn(headers, COLUMN_MAPPINGS.date)
  const unitIdx = findMatchingColumn(headers, COLUMN_MAPPINGS.unit)
  const typeIdx = findMatchingColumn(headers, COLUMN_MAPPINGS.type)
  const notesIdx = findMatchingColumn(headers, COLUMN_MAPPINGS.notes)

  const excluded = new Set<number>([nameIdx, monthIdx, yearIdx, dateIdx].filter(idx => idx >= 0))
  const qtyIdx = detectNumericColumn(headers, rows, excluded)

  const periodColumns = headers
    .map((header, idx) => ({ idx, period: parsePeriodFromHeader(header) }))
    .filter(item => item.period && item.idx !== nameIdx)

  if (nameIdx === -1) {
    errors.push(`Sheet ${sheetName}: tidak dapat mendeteksi kolom nama`) 
    return { data, headers, errors }
  }

  // Wide format: satu baris obat, banyak kolom periode
  if (periodColumns.length >= 2) {
    for (const row of rows) {
      const name = toStringValue(row?.[nameIdx])
      if (!name) continue

      for (const col of periodColumns) {
        const quantity = parseNumber(row?.[col.idx])
        if (quantity === null) continue

        const period = col.period!
        const master = masterMap.get(name.toLowerCase())
        data.push({
          name,
          quantity: Math.max(0, Math.round(quantity)),
          date: new Date(period.year, period.month - 1, 1),
          month: period.month,
          year: period.year,
          unit: toStringValue(row?.[unitIdx]) || master?.unit || undefined,
          type: toStringValue(row?.[typeIdx]) || master?.category || undefined,
          notes: toStringValue(row?.[notesIdx]) || undefined
        })
      }
    }

    return { data, headers, errors }
  }

  if (qtyIdx === -1) {
    errors.push(`Sheet ${sheetName}: tidak dapat mendeteksi kolom jumlah`) 
    return { data, headers, errors }
  }

  for (const row of rows) {
    const name = toStringValue(row?.[nameIdx])
    if (!name) continue

    const quantityValue = parseNumber(row?.[qtyIdx])
    if (quantityValue === null || quantityValue < 0) continue

    const master = masterMap.get(name.toLowerCase())

    let month = 0
    let year = 0
    let date = new Date()

    if (dateIdx !== -1) {
      const parsedDate = parseDate(row?.[dateIdx])
      if (parsedDate) {
        month = parsedDate.month
        year = parsedDate.year
        date = parsedDate.date
      }
    }

    if (!month && monthIdx !== -1) {
      const parsedMonth = parseNumber(row?.[monthIdx])
      if (parsedMonth) month = Math.max(1, Math.min(12, Math.round(parsedMonth)))
    }

    if (!year && yearIdx !== -1) {
      const parsedYear = parseNumber(row?.[yearIdx])
      if (parsedYear) year = Math.round(parsedYear)
    }

    if (!year) year = new Date().getFullYear()
    if (!month) month = 6
    date = new Date(year, month - 1, 1)

    data.push({
      name,
      quantity: Math.round(quantityValue),
      date,
      month,
      year,
      unit: toStringValue(row?.[unitIdx]) || master?.unit || undefined,
      type: toStringValue(row?.[typeIdx]) || master?.category || undefined,
      notes: toStringValue(row?.[notesIdx]) || undefined
    })
  }

  return { data, headers, errors }
}

export function parseExcelFile(buffer: ArrayBuffer): {
  data: ParsedMedicineData[]
  errors: string[]
  headers: string[]
  masterData?: { name: string; category?: string; stock?: number; unit?: string }[]
} {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  
  const errors: string[] = []
  const data: ParsedMedicineData[] = []
  let headers: string[] = []
  let masterData: { name: string; category?: string; stock?: number; unit?: string }[] = []

  // Parse candidate master sheets first
  const masterSheetNames = ['obat', 'medicine', 'master', 'daftar', 'list']
  for (const sheetName of workbook.SheetNames) {
    if (!masterSheetNames.some(key => sheetName.toLowerCase().includes(key))) {
      continue
    }

    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true, defval: null }) as any[][]
    if (rawRows.length < 2) continue

    const headerRowIdx = findHeaderRow(rawRows)
    const rowHeaders = (rawRows[headerRowIdx] || []).map(toStringValue)
    const nameIdx = findMatchingColumn(rowHeaders, COLUMN_MAPPINGS.name)
    const stockIdx = findMatchingColumn(rowHeaders, ['stok', 'stock', 'jumlah'])
    const unitIdx = findMatchingColumn(rowHeaders, COLUMN_MAPPINGS.unit)
    const categoryIdx = findMatchingColumn(rowHeaders, ['kategori', 'category', 'jenis', 'tipe', 'type'])

    if (nameIdx === -1) continue

    for (const row of rawRows.slice(headerRowIdx + 1)) {
      const name = toStringValue(row?.[nameIdx])
      if (!name) continue

      const stock = stockIdx !== -1 ? parseNumber(row?.[stockIdx]) : null
      masterData.push({
        name,
        category: categoryIdx !== -1 ? toStringValue(row?.[categoryIdx]) || undefined : undefined,
        stock: stock !== null ? Math.round(stock) : undefined,
        unit: unitIdx !== -1 ? toStringValue(row?.[unitIdx]) || undefined : undefined
      })
    }
  }

  const masterMap = new Map<string, { category?: string; stock?: number; unit?: string }>()
  for (const item of masterData) {
    masterMap.set(item.name.toLowerCase(), {
      category: item.category,
      stock: item.stock,
      unit: item.unit
    })
  }

  // Parse all sheets as potential usage data
  for (const sheetName of workbook.SheetNames) {
    const parsed = parseUsageSheet(workbook.Sheets[sheetName], sheetName, masterMap)
    if (parsed.headers.length > 0 && headers.length === 0) {
      headers = parsed.headers
    }
    if (parsed.data.length > 0) {
      data.push(...parsed.data)
    }
    if (parsed.errors.length > 0) {
      errors.push(...parsed.errors)
    }
  }

  // Jika tidak ada data pemakaian, gunakan data master
  if (data.length === 0 && masterData.length > 0) {
    const now = new Date()
    for (const med of masterData) {
      if (med.stock && med.stock > 0) {
        data.push({
          name: med.name,
          quantity: med.stock,
          date: now,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          unit: med.unit || DEFAULT_UNIT,
          type: med.category
        })
      }
    }
    errors.push('Menggunakan data stok dari sheet master karena data pemakaian tidak ditemukan')
  }

  if (data.length === 0) {
    errors.push('Tidak ditemukan data yang bisa dipetakan ke format nama + jumlah di workbook ini')
  }

  return { data, errors, headers, masterData }
}
