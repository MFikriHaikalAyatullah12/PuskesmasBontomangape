import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseExcelFile } from '@/lib/excel-parser'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const result = parseExcelFile(buffer)

    return NextResponse.json({
      data: result.data.map(d => ({
        name: d.name,
        quantity: d.quantity,
        date: d.date.toISOString(),
        month: d.month,
        year: d.year,
        unit: d.unit
      })),
      errors: result.errors,
      headers: result.headers
    })
  } catch (error: any) {
    console.error('Error parsing file:', error)
    return NextResponse.json({ error: error.message || 'Gagal membaca file' }, { status: 500 })
  }
}
