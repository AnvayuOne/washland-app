import { NextResponse } from 'next/server'
import { prisma } from '../../../../../src/lib/prisma'
import requireAdminHybrid from '../../../../../src/lib/hybrid-auth'
import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

export async function POST(req: Request) {
  try {
    const auth = await requireAdminHybrid(req, ['SUPER_ADMIN'])
    if (auth instanceof NextResponse && auth.status === 401) return auth

    const form = await req.formData()
    const file = form.get('file') as File
    const altText = (form.get('altText') as string) || ''
    const heroContentId = (form.get('heroContentId') as string) || null
    const position = (form.get('position') as string) || 'right'
    const displayOrder = parseInt((form.get('displayOrder') as string) || '0', 10)
  const isActiveRaw = form.get('isActive')
  const isActive = String(isActiveRaw) === 'true' || String(isActiveRaw) === 'on'

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const originalName = file.name || `upload-${Date.now()}`
    const ext = originalName.split('.').pop() || 'png'
    const filename = `${Date.now()}-${randomUUID()}.${ext}`

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.mkdir(uploadsDir, { recursive: true })
    const filePath = path.join(uploadsDir, filename)
    await fs.writeFile(filePath, buffer)

    let hcId = heroContentId
    if (!hcId) {
      const existing = await prisma.heroContent.findFirst()
      if (existing) hcId = existing.id
      else {
        const created = await prisma.heroContent.create({
          data: { title: 'Default Hero', subtitle: '', isActive: true }
        })
        hcId = created.id
      }
    }

    const created = await prisma.heroImage.create({
      data: {
        heroContentId: hcId,
        imageUrl: `/uploads/${filename}`,
        altText,
        position,
        displayOrder,
        isActive,
      },
    })

    return NextResponse.json(created)
  } catch (err) {
    console.error('hero-upload error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'upload failed' }, { status: 500 })
  }
}
