import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { parseExcelFile } from '@/lib/excel-parser'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const result = parseExcelFile(buffer)

    if (result.data.length === 0) {
      return NextResponse.json({ 
        error: 'Tidak ada data valid dalam file. Pastikan file Excel memiliki sheet "pemakaian" dengan kolom nama_obat, tahun, dan jumlah_pemakaian.',
        errors: result.errors 
      }, { status: 400 })
    }

    // Group data by medicine name
    const medicineMap = new Map<string, {
      name: string
      unit: string
      category?: string
      currentStock?: number
      histories: {
        quantity: number
        month: number
        year: number
        date: Date
      }[]
    }>()

    // Buat map dari master data terlebih dahulu
    const masterMap = new Map<string, { category?: string; stock?: number; unit?: string }>()
    if (result.masterData) {
      for (const master of result.masterData) {
        masterMap.set(master.name.toLowerCase().trim(), master)
      }
    }

    for (const item of result.data) {
      const key = item.name.toLowerCase().trim()
      const master = masterMap.get(key)
      
      if (!medicineMap.has(key)) {
        medicineMap.set(key, {
          name: item.name,
          unit: item.unit || master?.unit || 'tablet',
          category: item.type || master?.category,
          currentStock: master?.stock,
          histories: []
        })
      }

      medicineMap.get(key)!.histories.push({
        quantity: item.quantity,
        month: item.month,
        year: item.year,
        date: item.date
      })
    }

    const errors: string[] = [...result.errors]

    // ========== OPTIMIZED FAST IMPORT ==========
    
    // Step 1: Get all existing medicines in ONE query
    const existingMedicines = await prisma.medicine.findMany({
      where: { userId },
      select: { id: true, name: true }
    })
    
    const existingMap = new Map<string, string>()
    for (const med of existingMedicines) {
      existingMap.set(med.name.toLowerCase().trim(), med.id)
    }

    // Step 2: Separate new and existing medicines
    const newMedicines: any[] = []
    const updateMedicines: { id: string; data: any }[] = []
    const medicineIds = new Map<string, string>() // key -> medicineId
    
    for (const [key, data] of medicineMap) {
      const sortedHistories = data.histories.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year
        return b.month - a.month
      })
      const latestStock = data.currentStock || sortedHistories[0]?.quantity || 0
      
      const existingId = existingMap.get(key)
      
      if (existingId) {
        medicineIds.set(key, existingId)
        updateMedicines.push({
          id: existingId,
          data: { currentStock: latestStock, unit: data.unit }
        })
      } else {
        newMedicines.push({
          key,
          data: {
            name: data.name,
            unit: data.unit,
            currentStock: latestStock,
            minStock: Math.round(latestStock * 0.2) || 10,
            maxStock: Math.round(latestStock * 2) || 100,
            userId
          }
        })
      }
    }

    // Step 3: Batch create new medicines
    if (newMedicines.length > 0) {
      await prisma.medicine.createMany({
        data: newMedicines.map(m => m.data),
        skipDuplicates: true
      })
      
      // Get IDs of newly created medicines
      const createdMedicines = await prisma.medicine.findMany({
        where: { 
          userId,
          name: { in: newMedicines.map(m => m.data.name) }
        },
        select: { id: true, name: true }
      })
      
      for (const med of createdMedicines) {
        medicineIds.set(med.name.toLowerCase().trim(), med.id)
      }
    }

    // Step 4: Batch update existing medicines (parallel)
    if (updateMedicines.length > 0) {
      await Promise.all(
        updateMedicines.map(u => 
          prisma.medicine.update({ where: { id: u.id }, data: u.data })
        )
      )
      
      // Delete old histories for existing medicines
      const existingIds = updateMedicines.map(u => u.id)
      await prisma.stockHistory.deleteMany({
        where: { medicineId: { in: existingIds } }
      })
    }

    // Step 5: Batch create ALL stock histories at once
    const allHistories: any[] = []
    
    for (const [key, data] of medicineMap) {
      const medicineId = medicineIds.get(key)
      if (!medicineId) continue
      
      for (const history of data.histories) {
        allHistories.push({
          medicineId,
          userId,
          quantity: history.quantity,
          type: 'adjustment',
          date: history.date,
          month: history.month,
          year: history.year
        })
      }
    }

    // Insert histories in large batches (500 at a time)
    const BATCH_SIZE = 500
    for (let i = 0; i < allHistories.length; i += BATCH_SIZE) {
      const batch = allHistories.slice(i, i + BATCH_SIZE)
      await prisma.stockHistory.createMany({ data: batch })
    }

    return NextResponse.json({
      imported: medicineMap.size,
      total: medicineMap.size,
      totalHistories: allHistories.length,
      message: `Berhasil import ${medicineMap.size} obat dengan ${allHistories.length} data pemakaian`,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error: any) {
    console.error('Error importing data:', error)
    return NextResponse.json({ error: error.message || 'Gagal mengimport data' }, { status: 500 })
  }
}
