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
        error: 'Tidak ada data valid dalam file. Pastikan ada kolom nama item dan nilai jumlah pada salah satu sheet.',
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

    // ========== FAST REPLACE IMPORT ==========
    // Strategi: replace semua data user agar proses konsisten dan cepat.
    const medicinesToCreate: {
      key: string
      name: string
      unit: string
      currentStock: number
      minStock: number
      maxStock: number
    }[] = []

    for (const [key, data] of medicineMap) {
      let latestHistory = data.histories[0]
      for (const h of data.histories) {
        if (!latestHistory || h.year > latestHistory.year || (h.year === latestHistory.year && h.month > latestHistory.month)) {
          latestHistory = h
        }
      }

      const latestStock = data.currentStock || latestHistory?.quantity || 0
      medicinesToCreate.push({
        key,
        name: data.name,
        unit: data.unit,
        currentStock: latestStock,
        minStock: Math.round(latestStock * 0.2) || 10,
        maxStock: Math.round(latestStock * 2) || 100
      })
    }

    await prisma.$transaction([
      prisma.prediction.deleteMany({ where: { userId } }),
      prisma.stockHistory.deleteMany({ where: { userId } }),
      prisma.medicine.deleteMany({ where: { userId } })
    ])

    if (medicinesToCreate.length > 0) {
      await prisma.medicine.createMany({
        data: medicinesToCreate.map(m => ({
          name: m.name,
          unit: m.unit,
          currentStock: m.currentStock,
          minStock: m.minStock,
          maxStock: m.maxStock,
          userId
        }))
      })
    }

    const insertedMedicines = await prisma.medicine.findMany({
      where: { userId },
      select: { id: true, name: true }
    })

    const medicineIds = new Map<string, string>()
    for (const med of insertedMedicines) {
      medicineIds.set(med.name.toLowerCase().trim(), med.id)
    }

    // Batch create all stock histories
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

    // Insert histories in large batches
    const BATCH_SIZE = 2000
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
