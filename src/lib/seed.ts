import { db } from '@/lib/db'

// Seed a demo organization with users, modules, projects, tasks, rooms, bookings.
// Fully idempotent — safe to re-run; fills in any missing pieces.

const NOW = new Date()
const day = (offsetDays: number, hour = 10, minute = 0) => {
  const d = new Date(NOW)
  d.setDate(d.getDate() + offsetDays)
  d.setHours(hour, minute, 0, 0)
  return d
}

export async function seedDemoOrg() {
  let org = await db.organization.findFirst({ where: { slug: 'acme-design' } })

  if (!org) {
    org = await db.organization.create({
      data: {
        name: 'Acme Design Studio',
        slug: 'acme-design',
        plan: 'growth',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        onboardingDone: true,
      },
    })
  }
  const orgId = org.id

  // Departments — get-or-create by name
  const ensureDept = async (name: string) => {
    const existing = await db.department.findFirst({ where: { orgId, name } })
    if (existing) return existing
    return db.department.create({ data: { name, orgId } })
  }
  const [engineering, design, operations] = await Promise.all([
    ensureDept('Engineering'),
    ensureDept('Design'),
    ensureDept('Operations'),
  ])

  // Users — get-or-create by email
  const ensureUser = async (
    email: string,
    name: string,
    role: string,
    designation: string,
    departmentId: string
  ) => {
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) return existing
    return db.user.create({ data: { email, name, role, designation, orgId, departmentId } })
  }

  const [priya, rahul, anjali, vikram, sana] = await Promise.all([
    ensureUser('priya@acme.test', 'Priya Sharma', 'admin', 'Operations Head', operations.id),
    ensureUser('rahul@acme.test', 'Rahul Verma', 'manager', 'Engineering Lead', engineering.id),
    ensureUser('anjali@acme.test', 'Anjali Mehta', 'employee', 'Senior Designer', design.id),
    ensureUser('vikram@acme.test', 'Vikram Iyer', 'employee', 'Frontend Engineer', engineering.id),
    ensureUser('sana@acme.test', 'Sana Khan', 'manager', 'Design Lead', design.id),
  ])

  // Reporting manager chain (idempotent)
  await db.user.updateMany({ where: { id: rahul.id, reportingManagerId: null }, data: { reportingManagerId: priya.id } })
  await db.user.updateMany({ where: { id: sana.id, reportingManagerId: null }, data: { reportingManagerId: priya.id } })
  await db.user.updateMany({ where: { id: vikram.id, reportingManagerId: null }, data: { reportingManagerId: rahul.id } })
  await db.user.updateMany({ where: { id: anjali.id, reportingManagerId: null }, data: { reportingManagerId: sana.id } })

  // Modules — upsert
  const moduleSeeds: { key: string; state: 'disabled' | 'trial' | 'active' }[] = [
    { key: 'tasks', state: 'active' },
    { key: 'rooms', state: 'active' },
    { key: 'reporting', state: 'active' },
    { key: 'kra', state: 'disabled' },
    { key: 'budget', state: 'disabled' },
    { key: 'risk', state: 'disabled' },
    { key: 'collab', state: 'disabled' },
    { key: 'leave', state: 'disabled' },
    { key: 'resource', state: 'disabled' },
    { key: 'governance', state: 'disabled' },
  ]
  for (const m of moduleSeeds) {
    const existing = await db.orgModule.findUnique({
      where: { orgId_moduleKey: { orgId, moduleKey: m.key } },
    })
    if (existing) continue
    await db.orgModule.create({
      data: {
        orgId,
        moduleKey: m.key,
        state: m.state,
        enabledAt: m.state === 'active' ? new Date() : null,
      },
    })
  }

  // Projects — get-or-create by name
  const ensureProject = async (
    name: string,
    description: string,
    color: string,
    status: string,
    startDate: Date,
    endDate: Date,
    createdById: string
  ) => {
    const existing = await db.project.findFirst({ where: { orgId, name } })
    if (existing) return existing
    return db.project.create({
      data: { orgId, name, description, color, status, startDate, endDate, createdById },
    })
  }

  const [nexusApp, brandRefresh, clientPortal] = await Promise.all([
    ensureProject('Nexus Mobile App', 'Cross-platform mobile companion for the Nexus Suite.', '#0ea5e9', 'active', day(-14), day(30), priya.id),
    ensureProject('Brand Refresh 2026', 'New visual identity and marketing site redesign.', '#f59e0b', 'active', day(-7), day(45), sana.id),
    ensureProject('Client Portal v2', 'Self-service portal for agency clients.', '#10b981', 'on_hold', day(-30), day(60), priya.id),
  ])

  // Tasks — get-or-create by title within project
  const tasks = [
    { projectId: nexusApp.id, title: 'Design login & signup flows', status: 'done', priority: 'high', type: 'feature', assigneeId: anjali.id, reporterId: sana.id, dueDate: day(-2), estimateHours: 12, spentHours: 11, tags: 'mobile,auth' },
    { projectId: nexusApp.id, title: 'Build authentication API', status: 'done', priority: 'high', type: 'feature', assigneeId: vikram.id, reporterId: rahul.id, dueDate: day(-1), estimateHours: 16, spentHours: 18, tags: 'backend,auth' },
    { projectId: nexusApp.id, title: 'Implement task list screen', status: 'in_progress', priority: 'high', type: 'feature', assigneeId: vikram.id, reporterId: rahul.id, dueDate: day(3), estimateHours: 20, spentHours: 8, tags: 'mobile,ui' },
    { projectId: nexusApp.id, title: 'Push notification integration', status: 'todo', priority: 'medium', type: 'feature', assigneeId: vikram.id, reporterId: rahul.id, dueDate: day(10), estimateHours: 10, tags: 'mobile,notifications' },
    { projectId: nexusApp.id, title: 'Crash on iPad landscape mode', status: 'blocked', priority: 'urgent', type: 'bug', assigneeId: vikram.id, reporterId: priya.id, dueDate: day(1), estimateHours: 6, tags: 'mobile,bug' },
    { projectId: nexusApp.id, title: 'App store screenshots', status: 'todo', priority: 'low', type: 'task', assigneeId: anjali.id, reporterId: sana.id, dueDate: day(14), estimateHours: 4, tags: 'design,marketing' },

    { projectId: brandRefresh.id, title: 'Audit current brand assets', status: 'done', priority: 'medium', type: 'task', assigneeId: anjali.id, reporterId: sana.id, dueDate: day(-5), estimateHours: 6, spentHours: 5, tags: 'brand' },
    { projectId: brandRefresh.id, title: 'Mood board & color exploration', status: 'in_review', priority: 'medium', type: 'task', assigneeId: anjali.id, reporterId: sana.id, dueDate: day(1), estimateHours: 8, spentHours: 7, tags: 'brand,design' },
    { projectId: brandRefresh.id, title: 'Logo concepts round 1', status: 'in_progress', priority: 'high', type: 'task', assigneeId: sana.id, reporterId: priya.id, dueDate: day(5), estimateHours: 12, spentHours: 4, tags: 'brand,logo' },
    { projectId: brandRefresh.id, title: 'Marketing site hero section', status: 'todo', priority: 'high', type: 'feature', assigneeId: anjali.id, reporterId: sana.id, dueDate: day(12), estimateHours: 14, tags: 'web,design' },

    { projectId: clientPortal.id, title: 'Gather requirements from 3 pilot clients', status: 'in_progress', priority: 'high', type: 'task', assigneeId: priya.id, reporterId: priya.id, dueDate: day(7), estimateHours: 6, spentHours: 2, tags: 'research' },
    { projectId: clientPortal.id, title: 'Wireframes for dashboard', status: 'todo', priority: 'medium', type: 'task', assigneeId: anjali.id, reporterId: priya.id, dueDate: day(14), estimateHours: 10, tags: 'design' },
  ]

  for (const t of tasks) {
    const existing = await db.task.findFirst({ where: { projectId: t.projectId, title: t.title } })
    if (existing) continue
    await db.task.create({ data: { orgId, ...t } })
  }

  // Rooms — get-or-create by name
  const ensureRoom = async (name: string, location: string, capacity: number, amenities: string) => {
    const existing = await db.room.findFirst({ where: { orgId, name } })
    if (existing) return existing
    return db.room.create({ data: { orgId, name, location, capacity, amenities } })
  }
  const [neptune, mars, jupiter, orion] = await Promise.all([
    ensureRoom('Neptune', 'Floor 1', 12, 'projector,video,whiteboard'),
    ensureRoom('Mars', 'Floor 1', 6, 'tv,whiteboard'),
    ensureRoom('Jupiter', 'Floor 2', 20, 'projector,video,audio,whiteboard'),
    ensureRoom('Orion', 'Floor 2', 4, 'tv'),
  ])

  // Bookings — get-or-create by (roomId, startTime)
  const bookings = [
    { roomId: neptune.id, bookedById: priya.id, title: 'Weekly leadership sync', startTime: day(0, 10, 0), endTime: day(0, 11, 0), attendees: 5, recurring: 'weekly' },
    { roomId: mars.id, bookedById: rahul.id, title: 'Eng standup', startTime: day(0, 9, 30), endTime: day(0, 9, 45), attendees: 4, recurring: 'daily' },
    { roomId: jupiter.id, bookedById: sana.id, title: 'Brand mood board review', startTime: day(1, 14, 0), endTime: day(1, 15, 30), attendees: 8 },
    { roomId: orion.id, bookedById: anjali.id, title: '1:1 with Sana', startTime: day(1, 11, 0), endTime: day(1, 11, 30), attendees: 2, recurring: 'weekly' },
    { roomId: neptune.id, bookedById: priya.id, title: 'Client kickoff — Nexus App', startTime: day(2, 16, 0), endTime: day(2, 17, 0), attendees: 6 },
    { roomId: mars.id, bookedById: vikram.id, title: 'Code review: auth API', startTime: day(0, 15, 0), endTime: day(0, 15, 45), attendees: 3 },
    { roomId: jupiter.id, bookedById: priya.id, title: 'All-hands', startTime: day(3, 12, 0), endTime: day(3, 13, 0), attendees: 18, recurring: 'weekly' },
  ]
  for (const b of bookings) {
    const existing = await db.booking.findFirst({
      where: { roomId: b.roomId, startTime: b.startTime },
    })
    if (existing) continue
    await db.booking.create({ data: { orgId, ...b } })
  }

  // Notifications — only seed if user has zero
  const notifCount = await db.notification.count({ where: { userId: priya.id } })
  if (notifCount === 0) {
    await db.notification.createMany({
      data: [
        { orgId, userId: priya.id, title: 'Task blocked', body: '“Crash on iPad landscape mode” was marked blocked by Vikram.', category: 'task', severity: 'warning', link: 'tasks' },
        { orgId, userId: priya.id, title: 'Booking reminder', body: 'Weekly leadership sync starts in 30 minutes in Neptune.', category: 'booking', severity: 'info', link: 'rooms' },
        { orgId, userId: rahul.id, title: 'New task assigned', body: 'You are reporter on “Push notification integration”.', category: 'task', severity: 'info', link: 'tasks' },
        { orgId, userId: vikram.id, title: 'Approval needed', body: 'Code review for auth API scheduled today 3:00 PM.', category: 'booking', severity: 'info', link: 'rooms' },
        { orgId, userId: sana.id, title: 'Review requested', body: 'Anjali requested review on “Mood board & color exploration”.', category: 'task', severity: 'info', link: 'tasks' },
      ],
    })
  }

  // Audit logs — only seed if empty
  const auditCount = await db.auditLog.count({ where: { orgId } })
  if (auditCount === 0) {
    await db.auditLog.createMany({
      data: [
        { orgId, actorId: priya.id, action: 'org.created', entityType: 'Organization', entityId: orgId },
        { orgId, actorId: priya.id, action: 'module.enabled', entityType: 'OrgModule', metadata: JSON.stringify({ moduleKey: 'tasks' }) },
        { orgId, actorId: priya.id, action: 'module.enabled', entityType: 'OrgModule', metadata: JSON.stringify({ moduleKey: 'rooms' }) },
        { orgId, actorId: priya.id, action: 'module.enabled', entityType: 'OrgModule', metadata: JSON.stringify({ moduleKey: 'reporting' }) },
      ],
    })
  }

  return org
}

export async function getDemoContext() {
  const org = await db.organization.findFirst({ where: { slug: 'acme-design' } })
  if (!org) return null
  const user = await db.user.findFirst({ where: { email: 'priya@acme.test' } })
  return { org, user }
}
