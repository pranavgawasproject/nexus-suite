import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
config({ path: '/home/z/my-project/.env' })
console.log('DATABASE_URL=', process.env.DATABASE_URL)
const db = new PrismaClient()
const orgCount = await db.organization.count()
const userCount = await db.user.count()
const taskCount = await db.task.count()
const modCount = await db.orgModule.count()
console.log(`Orgs: ${orgCount}, Users: ${userCount}, Tasks: ${taskCount}, Modules: ${modCount}`)
const mods = await db.orgModule.findMany({ orderBy: { moduleKey: 'asc' }})
console.log('Modules:')
for (const m of mods) console.log(`  ${m.moduleKey}: ${m.state} (enabledAt=${m.enabledAt?.toISOString() ?? 'null'})`)
await db.$disconnect()
