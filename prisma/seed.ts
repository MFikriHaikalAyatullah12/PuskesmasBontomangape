import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Delete existing users first
  await prisma.prediction.deleteMany()
  await prisma.stockHistory.deleteMany()
  await prisma.medicine.deleteMany()
  await prisma.user.deleteMany()

  // Create Account 1
  const password1 = await hash('puskesmas_bontomangape', 12)
  const user1 = await prisma.user.create({
    data: {
      username: 'puskesmasbontorita@obat',
      password: password1,
      name: 'Puskesmas Bontorita'
    }
  })
  console.log('Created user 1:', user1.username)

  // Create Account 2
  const password2 = await hash('klinikbontorita', 12)
  const user2 = await prisma.user.create({
    data: {
      username: 'adminpuskesmas',
      password: password2,
      name: 'Admin Puskesmas'
    }
  })
  console.log('Created user 2:', user2.username)

  console.log('Seeding completed!')
  console.log('')
  console.log('=== AKUN LOGIN PUSKESMAS ===')
  console.log('')
  console.log('Akun 1:')
  console.log('  Username: puskesmasbontorita@obat')
  console.log('  Password: puskesmas_bontomangape')
  console.log('')
  console.log('Akun 2:')
  console.log('  Username: adminpuskesmas')
  console.log('  Password: klinikbontorita')
  console.log('')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
