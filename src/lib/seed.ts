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

  // ----- MODULE 8: Leave & Attendance -----
  const leaveCount = await db.leave.count({ where: { orgId } })
  if (leaveCount === 0) {
    await db.leave.createMany({
      data: [
        { orgId, userId: vikram.id, type: 'casual', startDate: day(2, 0, 0), endDate: day(3, 23, 59), status: 'approved', reason: 'Family function', approverId: rahul.id, decidedAt: new Date(), appliedAt: day(-3) },
        { orgId, userId: anjali.id, type: 'sick', startDate: day(1, 0, 0), endDate: day(1, 23, 59), status: 'approved', reason: 'Fever', approverId: sana.id, decidedAt: new Date(), appliedAt: day(-1) },
        { orgId, userId: rahul.id, type: 'earned', startDate: day(7, 0, 0), endDate: day(10, 23, 59), status: 'pending', reason: 'Pre-planned vacation', appliedAt: day(-1) },
        { orgId, userId: sana.id, type: 'work_from_home', startDate: day(0, 0, 0), endDate: day(0, 23, 59), status: 'pending', reason: 'Plumber visit', appliedAt: day(0) },
        { orgId, userId: priya.id, type: 'comp_off', startDate: day(-5, 0, 0), endDate: day(-5, 23, 59), status: 'approved', reason: 'Worked on weekend for launch', approverId: priya.id, decidedAt: day(-4), appliedAt: day(-6) },
      ],
    })
  }

  const holidayCount = await db.holiday.count({ where: { orgId } })
  if (holidayCount === 0) {
    await db.holiday.createMany({
      data: [
        { orgId, name: 'Independence Day', date: day(20, 0, 0), optional: false },
        { orgId, name: 'Ganesh Chaturthi', date: day(35, 0, 0), optional: false },
        { orgId, name: 'Diwali', date: day(85, 0, 0), optional: false },
        { orgId, name: 'Christmas', date: day(155, 0, 0), optional: false },
      ],
    })
  }

  // Attendance — seed for the last 3 working days for all 5 users
  const attendanceCount = await db.attendance.count({ where: { orgId } })
  if (attendanceCount === 0) {
    const allUsers = [priya, rahul, anjali, vikram, sana]
    const records: Array<{ orgId: string; userId: string; date: Date; checkIn: Date; checkOut: Date; workMode: string }> = []
    for (let i = 1; i <= 3; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      d.setUTCHours(0, 0, 0, 0)
      // Skip weekends
      if (d.getDay() === 0 || d.getDay() === 6) continue
      for (const [idx, u] of allUsers.entries()) {
        const checkIn = new Date(d)
        checkIn.setHours(9 + idx, 15 + (idx * 7) % 30, 0, 0)
        const checkOut = new Date(d)
        checkOut.setHours(18 + (idx % 2), 30 + (idx * 11) % 30, 0, 0)
        records.push({
          orgId,
          userId: u.id,
          date: d,
          checkIn,
          checkOut,
          workMode: idx === 2 ? 'remote' : 'office',
        })
      }
    }
    if (records.length > 0) {
      await db.attendance.createMany({ data: records })
    }
  }

  // ----- MODULE 4: Resource & Capacity -----
  const allocCount = await db.allocation.count({ where: { orgId } })
  if (allocCount === 0) {
    await db.allocation.createMany({
      data: [
        { orgId, userId: vikram.id, projectId: nexusApp.id, allocationPct: 80, role: 'Frontend Engineer', startDate: day(-14) },
        { orgId, userId: vikram.id, projectId: clientPortal.id, allocationPct: 20, role: 'Frontend Engineer', startDate: day(-30) },
        { orgId, userId: anjali.id, projectId: brandRefresh.id, allocationPct: 70, role: 'Senior Designer', startDate: day(-7) },
        { orgId, userId: anjali.id, projectId: nexusApp.id, allocationPct: 30, role: 'Senior Designer', startDate: day(-14) },
        { orgId, userId: rahul.id, projectId: nexusApp.id, allocationPct: 50, role: 'Engineering Lead', startDate: day(-14) },
        { orgId, userId: sana.id, projectId: brandRefresh.id, allocationPct: 60, role: 'Design Lead', startDate: day(-7) },
        { orgId, userId: priya.id, projectId: clientPortal.id, allocationPct: 40, role: 'Operations Head', startDate: day(-30) },
        { orgId, userId: priya.id, projectId: nexusApp.id, allocationPct: 30, role: 'Operations Head', startDate: day(-14) },
      ],
    })
  }

  // ----- MODULE 2: KRA/KPA -----
  const kraCount = await db.kra.count({ where: { orgId } })
  if (kraCount === 0) {
    await db.kra.createMany({
      data: [
        // Vikram's KRAs for Q3-2026
        { orgId, userId: vikram.id, title: 'Ship Nexus App v1', description: 'Lead mobile app development through launch.', cycle: 'Q3-2026', weight: 40, targetRating: 4, status: 'self_review', selfRating: 4, selfComment: 'App shipped on time with 95% crash-free sessions.' },
        { orgId, userId: vikram.id, title: 'Mentor 2 junior engineers', description: 'Onboard and grow 2 new hires.', cycle: 'Q3-2026', weight: 25, targetRating: 3, status: 'self_review', selfRating: 3, selfComment: 'Both onboarded; one promoted to mid-level.' },
        { orgId, userId: vikram.id, title: 'Reduce auth API p95 latency', description: 'Get p95 under 200ms.', cycle: 'Q3-2026', weight: 35, targetRating: 4, status: 'manager_review', selfRating: 4, selfComment: 'Achieved 180ms p95 via query optimization.' },
        // Anjali's KRAs
        { orgId, userId: anjali.id, title: 'Brand refresh completion', description: 'Deliver new visual identity.', cycle: 'Q3-2026', weight: 50, targetRating: 4, status: 'self_review', selfRating: 4, selfComment: 'Logo concepts approved; site hero in progress.' },
        { orgId, userId: anjali.id, title: 'Design system v2', description: 'Refresh component library.', cycle: 'Q3-2026', weight: 50, targetRating: 3, status: 'draft' },
        // Rahul's KRAs
        { orgId, userId: rahul.id, title: 'Engineering OKR delivery', description: 'Hit 80% of quarterly OKRs.', cycle: 'Q3-2026', weight: 60, targetRating: 4, status: 'manager_review', selfRating: 4, selfComment: 'Hit 7 of 8 OKRs.' },
        { orgId, userId: rahul.id, title: 'Hire 2 backend engineers', description: 'Close 2 reqs by end of quarter.', cycle: 'Q3-2026', weight: 40, targetRating: 3, status: 'draft' },
      ],
    })
  }

  // ----- MODULE 5: Budget & Expenses -----
  const budgetCount = await db.budget.count({ where: { orgId } })
  if (budgetCount === 0) {
    await db.budget.createMany({
      data: [
        { orgId, projectId: nexusApp.id, totalAmount: 850000, currency: 'INR', notes: 'Includes dev + design + QA for Q3' },
        { orgId, projectId: brandRefresh.id, totalAmount: 350000, currency: 'INR', notes: 'Agency + freelance design' },
        { orgId, projectId: clientPortal.id, totalAmount: 1200000, currency: 'INR', notes: 'On hold — pending pilot client signoff' },
      ],
    })
  }

  const expenseCount = await db.expense.count({ where: { orgId } })
  if (expenseCount === 0) {
    await db.expense.createMany({
      data: [
        { orgId, projectId: nexusApp.id, incurredById: priya.id, title: 'Apple Developer Program', amount: 9900, currency: 'INR', category: 'software', incurredDate: day(-10), vendor: 'Apple' },
        { orgId, projectId: nexusApp.id, incurredById: priya.id, title: 'Sentry (annual)', amount: 22000, currency: 'INR', category: 'software', incurredDate: day(-12), vendor: 'Sentry' },
        { orgId, projectId: nexusApp.id, incurredById: rahul.id, title: 'Test devices — iPhone 14 + Pixel 7', amount: 145000, currency: 'INR', category: 'hardware', incurredDate: day(-8), vendor: 'Amazon' },
        { orgId, projectId: brandRefresh.id, incurredById: sana.id, title: 'Adobe CC (3 seats, monthly)', amount: 7500, currency: 'INR', category: 'software', incurredDate: day(-5), vendor: 'Adobe' },
        { orgId, projectId: brandRefresh.id, incurredById: sana.id, title: 'Font licence — Söhne', amount: 38000, currency: 'INR', category: 'software', incurredDate: day(-3), vendor: 'Klim Type Foundry' },
        { orgId, projectId: nexusApp.id, incurredById: rahul.id, title: 'Team dinner — sprint wrap', amount: 6800, currency: 'INR', category: 'meals', incurredDate: day(-1), vendor: 'Local restaurant' },
        { orgId, projectId: clientPortal.id, incurredById: priya.id, title: 'Client kickoff catering', amount: 4200, currency: 'INR', category: 'meals', incurredDate: day(-2), vendor: 'The Table' },
      ],
    })
  }

  // Mark Phase 2 modules as active in the demo org
  await db.orgModule.updateMany({
    where: { orgId, moduleKey: { in: ['leave', 'resource', 'kra', 'budget', 'collab'] }, state: 'disabled' },
    data: { state: 'active', enabledAt: new Date() },
  })

  // ----- MODULE 7: Collaboration & Docs — seed a few wiki pages -----
  const docCount = await db.document.count({ where: { orgId } })
  if (docCount === 0) {
    await db.document.createMany({
      data: [
        {
          orgId, title: 'Engineering Handbook', slug: 'engineering-handbook',
          content: '# Engineering Handbook\n\nWelcome to the team. This doc covers:\n\n- Code review process\n- Branching strategy\n- Deployment pipeline\n\n## Code review process\n\nAll PRs require 1 approval from a senior engineer. Use the PR template.\n\n## Branching\n\n- `main` is always deployable\n- Feature branches: `feat/<ticket>`\n- Bugfix branches: `fix/<ticket>`\n\n## Deployment\n\nWe ship to staging on every merge to `main`. Production deploys are manual via the deploy button.',
          isPublic: false, version: 1, createdById: rahul.id, updatedById: rahul.id,
        },
        {
          orgId, title: 'Brand Guidelines', slug: 'brand-guidelines',
          content: '# Brand Guidelines\n\n## Logo usage\n\n- Minimum size: 120px wide\n- Clear space: 1x the height of the logo\n- Don\'t stretch or recolor\n\n## Colors\n\n| Role | Hex |\n|---|---|\n| Primary | #10b981 |\n| Accent | #f59e0b |\n| Background | #ffffff |\n\n## Typography\n\n- Headings: Inter Bold\n- Body: Inter Regular\n- Mono: JetBrains Mono',
          isPublic: true, version: 1, createdById: sana.id, updatedById: sana.id,
        },
        {
          orgId, title: 'Onboarding Checklist', slug: 'onboarding-checklist',
          content: '# New Hire Onboarding\n\n## Day 1\n- [ ] Laptop + peripherals setup\n- [ ] Accounts: Google, Slack, GitHub, Nexus Suite\n- [ ] Meet your manager and team\n\n## Week 1\n- [ ] Read Engineering Handbook\n- [ ] Ship a small PR\n- [ ] 1:1s with 5 teammates\n\n## Month 1\n- [ ] Own a small feature end-to-end\n- [ ] First performance check-in',
          isPublic: false, version: 1, createdById: priya.id, updatedById: priya.id,
        },
      ],
    })

    // Create initial version snapshots for each doc
    const docs = await db.document.findMany({ where: { orgId } })
    for (const d of docs) {
      await db.documentVersion.create({
        data: {
          documentId: d.id,
          version: 1,
          content: d.content,
          editedById: d.updatedById,
          changeSummary: 'Initial version',
        },
      })
    }
  }

  return org
}

export async function getDemoContext() {
  const org = await db.organization.findFirst({ where: { slug: 'acme-design' } })
  if (!org) return null
  const user = await db.user.findFirst({ where: { email: 'priya@acme.test' } })
  return { org, user }
}
