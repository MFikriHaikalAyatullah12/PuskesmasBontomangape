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

  // ============================================
  // STEP 1: Cari sheet "pemakaian" untuk data historis
  // ============================================
  const pemakaianSheetNames = ['pemakaian', 'usage', 'history', 'riwayat', 'historical']
  let pemakaianSheet: XLSX.WorkSheet | null = null
  let pemakaianSheetName = ''
  
  for (const name of workbook.SheetNames) {
    if (pemakaianSheetNames.some(p => name.toLowerCase().includes(p))) {
      pemakaianSheet = workbook.Sheets[name]
      pemakaianSheetName = name
      break
    }
  }

  // ============================================
  // STEP 2: Cari sheet "obat" untuk data master
  // ============================================
  const obatSheetNames = ['obat', 'medicine', 'master', 'daftar', 'list']
  let obatSheet: XLSX.WorkSheet | null = null
  
  for (const name of workbook.SheetNames) {
    if (obatSheetNames.some(o => name.toLowerCase().includes(o))) {
      obatSheet = workbook.Sheets[name]
      break
    }
  }

  // Jika tidak ada sheet spesifik, gunakan sheet pertama
  if (!pemakaianSheet && !obatSheet) {
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    // Cek apakah sheet pertama punya kolom tahun (berarti data pemakaian)
    const rawFirst = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]
    if (rawFirst.length > 0) {
      const firstHeaders = rawFirst[0].map(h => String(h || '').toLowerCase())
      if (firstHeaders.some(h => h.includes('tahun') || h.includes('year'))) {
        pemakaianSheet = firstSheet
      } else {
        obatSheet = firstSheet
      }
    }
  }

  // ============================================
  // STEP 3: Parse sheet master obat (jika ada)
  // ============================================
  if (obatSheet) {
    const rawObat = XLSX.utils.sheet_to_json(obatSheet, { header: 1, raw: false }) as any[][]
    
    if (rawObat.length >= 2) {
      const obatHeaders = rawObat[0].map(h => String(h || '').trim())
      const nameIdx = findMatchingColumn(obatHeaders, COLUMN_MAPPINGS.name)
      const stockIdx = findMatchingColumn(obatHeaders, ['stok', 'stock', 'jumlah'])
      const unitIdx = findMatchingColumn(obatHeaders, COLUMN_MAPPINGS.unit)
      const categoryIdx = findMatchingColumn(obatHeaders, ['kategori', 'category', 'jenis', 'tipe', 'type'])
      
      if (nameIdx !== -1) {
        for (let i = 1; i < rawObat.length; i++) {
          const row = rawObat[i]
          if (!row || !row[nameIdx]) continue
          
          masterData.push({
            name: row[nameIdx]?.toString().trim(),
            category: categoryIdx !== -1 ? row[categoryIdx]?.toString() : undefined,
            stock: stockIdx !== -1 ? parseInt(row[stockIdx]) || 0 : undefined,
            unit: unitIdx !== -1 ? row[unitIdx]?.toString() : undefined
          })
        }
      }
    }
  }

  // ============================================
  // STEP 4: Parse sheet pemakaian (DATA UTAMA UNTUK PREDIKSI)
  // ============================================
  if (pemakaianSheet) {
    const rawData = XLSX.utils.sheet_to_json(pemakaianSheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' }) as any[][]
    
    if (rawData.length < 2) {
      errors.push('Sheet pemakaian kosong atau tidak memiliki data')
    } else {
      headers = rawData[0].map(h => String(h || '').trim())

      // Find column indices
      const nameIdx = findMatchingColumn(headers, COLUMN_MAPPINGS.name)
      const qtyIdx = findMatchingColumn(headers, COLUMN_MAPPINGS.quantity)
      const dateIdx = findMatchingColumn(headers, COLUMN_MAPPINGS.date)
      const monthIdx = findMatchingColumn(headers, COLUMN_MAPPINGS.month)
      const yearIdx = findMatchingColumn(headers, COLUMN_MAPPINGS.year)
      const unitIdx = findMatchingColumn(headers, COLUMN_MAPPINGS.unit)
      const typeIdx = findMatchingColumn(headers, COLUMN_MAPPINGS.type)
      const notesIdx = findMatchingColumn(headers, COLUMN_MAPPINGS.notes)

      if (nameIdx === -1) {
        errors.push('Tidak dapat menemukan kolom nama obat di sheet pemakaian')
      } else if (qtyIdx === -1) {
        errors.push('Tidak dapat menemukan kolom jumlah pemakaian')
      } else {
        // Parse data rows
        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i]
          if (!row || row.length === 0) continue

          const name = row[nameIdx]?.toString().trim()
          if (!name) continue

          const quantity = parseInt(row[qtyIdx]) || 0
          if (quantity < 0) continue

          let dateInfo: { date: Date; month: number; year: number }

          // Data pemakaian biasanya punya kolom tahun
          if (yearIdx !== -1) {
            const year = parseInt(row[yearIdx]) || new Date().getFullYear()
            const month = monthIdx !== -1 ? (parseInt(row[monthIdx]) || 6) : 6 // Default tengah tahun
            dateInfo = { date: new Date(year, month - 1, 1), month, year }
          }
          // Atau kolom tanggal
          else if (dateIdx !== -1) {
            const parsed = parseDate(row[dateIdx])
            if (parsed) {
              dateInfo = parsed
            } else {
              const now = new Date()
              dateInfo = { date: now, month: now.getMonth() + 1, year: now.getFullYear() }
            }
          }
          // Default
          else {
            const now = new Date()
            dateInfo = { date: now, month: now.getMonth() + 1, year: now.getFullYear() }
          }

          // Cari unit dari master data jika tidak ada di pemakaian
          let unit = unitIdx !== -1 ? row[unitIdx]?.toString() : undefined
          if (!unit) {
            const master = masterData.find(m => m.name.toLowerCase() === name.toLowerCase())
            unit = master?.unit
          }

          data.push({
            name,
            quantity,
            date: dateInfo.date,
            month: dateInfo.month,
            year: dateInfo.year,
            unit,
            type: typeIdx !== -1 ? row[typeIdx]?.toString() : undefined,
            notes: notesIdx !== -1 ? row[notesIdx]?.toString() : undefined
          })
        }
      }
    }
  }

  // ============================================
  // STEP 5: Jika tidak ada data pemakaian, gunakan data master
  // ============================================
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
          unit: med.unit,
          type: med.category
        })
      }
    }
    errors.push('Menggunakan data stok dari sheet obat karena sheet pemakaian tidak ditemukan')
  }

  return { data, errors, headers, masterData }
}
