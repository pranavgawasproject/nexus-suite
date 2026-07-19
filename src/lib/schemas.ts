import { z } from 'zod'

// ============================================================
// Task / Project schemas (Module 1)
// ============================================================

export const taskStatusEnum = z.enum(['todo', 'in_progress', 'in_review', 'done', 'blocked'])
export const taskPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent'])
export const taskTypeEnum = z.enum(['task', 'feature', 'bug', 'epic'])

export const createTaskSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
  title: z.string().min(1, 'title is required').max(200, 'title too long'),
  description: z.string().max(5000).optional().nullable(),
  status: taskStatusEnum.optional().default('todo'),
  priority: taskPriorityEnum.optional().default('medium'),
  type: taskTypeEnum.optional().default('task'),
  assigneeId: z.string().optional().nullable(),
  reporterId: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  estimateHours: z.number().min(0).optional().nullable(),
  tags: z.string().max(500).optional().nullable(),
})

export const updateTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  type: taskTypeEnum.optional(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  estimateHours: z.number().min(0).optional().nullable(),
  spentHours: z.number().min(0).optional(),
  tags: z.string().max(500).optional().nullable(),
  position: z.number().int().min(0).optional(),
})

export const createProjectSchema = z.object({
  name: z.string().min(1, 'name is required').max(120),
  description: z.string().max(2000).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'color must be #rrggbb').optional().default('#64748b'),
  status: z.enum(['active', 'on_hold', 'completed', 'archived']).optional().default('active'),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
})

export const updateProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  status: z.enum(['active', 'on_hold', 'completed', 'archived']).optional(),
})

// ============================================================
// Room / Booking schemas (Module 3)
// ============================================================

export const createRoomSchema = z.object({
  name: z.string().min(1, 'name is required').max(100),
  location: z.string().max(200).optional().nullable(),
  capacity: z.number().int().min(1).max(500).optional().default(4),
  amenities: z.string().max(500).optional().nullable(),
  active: z.boolean().optional().default(true),
})

export const updateRoomSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  location: z.string().max(200).optional().nullable(),
  capacity: z.number().int().min(1).max(500).optional(),
  amenities: z.string().max(500).optional().nullable(),
  active: z.boolean().optional(),
})

export const recurringEnum = z.enum(['none', 'daily', 'weekly', 'monthly'])

export const createBookingSchema = z.object({
  roomId: z.string().min(1, 'roomId is required'),
  title: z.string().min(1, 'title is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  startTime: z.string().datetime({ message: 'startTime must be ISO 8601' }),
  endTime: z.string().datetime({ message: 'endTime must be ISO 8601' }),
  attendees: z.number().int().min(1).max(500).optional().default(1),
  recurring: recurringEnum.optional().default('none'),
}).refine((d) => new Date(d.endTime) > new Date(d.startTime), {
  message: 'endTime must be after startTime',
  path: ['endTime'],
})

export const updateBookingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  attendees: z.number().int().min(1).max(500).optional(),
})

// ============================================================
// Module toggle / onboarding schemas
// ============================================================

export const moduleStateEnum = z.enum(['disabled', 'trial', 'active', 'archived'])

export const toggleModuleSchema = z.object({
  moduleKey: z.string().min(1),
  state: moduleStateEnum,
})

export const completeOnboardingSchema = z.object({
  bundleId: z.string().optional().default('custom'),
  moduleKeys: z.array(z.string().min(1)).min(1, 'pick at least one module'),
})

// ============================================================
// Notification schemas
// ============================================================

export const updateNotificationSchema = z.object({
  id: z.string().optional(),
  markAllRead: z.boolean().optional(),
})

// ============================================================
// Leave / Attendance schemas (Module 8)
// ============================================================

export const leaveStatusEnum = z.enum(['pending', 'approved', 'rejected', 'cancelled'])
export const leaveTypeEnum = z.enum([
  'casual',
  'sick',
  'earned',
  'comp_off',
  'maternity',
  'paternity',
  'unpaid',
  'work_from_home',
])

export const createLeaveSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  type: leaveTypeEnum,
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().max(2000).optional().nullable(),
  halfDay: z.boolean().optional().default(false),
}).refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
  message: 'endDate must be on or after startDate',
  path: ['endDate'],
})

export const updateLeaveSchema = z.object({
  id: z.string().min(1),
  status: leaveStatusEnum,
  approverNote: z.string().max(1000).optional().nullable(),
})

export const attendanceActionEnum = z.enum(['check_in', 'check_out'])

export const attendanceSchema = z.object({
  userId: z.string().min(1),
  action: attendanceActionEnum,
  timestamp: z.string().datetime().optional(),
})

// ============================================================
// Resource / Capacity schemas (Module 4)
// ============================================================

export const createAllocationSchema = z.object({
  userId: z.string().min(1),
  projectId: z.string().min(1),
  allocationPct: z.number().int().min(0).max(100),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  role: z.string().max(100).optional().nullable(),
}).refine(
  (d) => !d.endDate || new Date(d.endDate) >= new Date(d.startDate),
  { message: 'endDate must be on or after startDate', path: ['endDate'] }
)

export const updateAllocationSchema = z.object({
  id: z.string().min(1),
  allocationPct: z.number().int().min(0).max(100).optional(),
  endDate: z.string().datetime().optional().nullable(),
  role: z.string().max(100).optional().nullable(),
})

// ============================================================
// KRA / KPA schemas (Module 2)
// ============================================================

export const kraStatusEnum = z.enum(['draft', 'self_review', 'manager_review', 'calibration', 'closed'])

export const createKraSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  userId: z.string().min(1),
  cycle: z.string().min(1).max(50), // e.g. "Q1-2026"
  weight: z.number().min(0).max(100).optional().default(25),
  targetRating: z.number().min(1).max(5).optional().default(3),
})

export const updateKraSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: kraStatusEnum.optional(),
  weight: z.number().min(0).max(100).optional(),
  targetRating: z.number().min(1).max(5).optional(),
  selfRating: z.number().min(1).max(5).optional().nullable(),
  managerRating: z.number().min(1).max(5).optional().nullable(),
  selfComment: z.string().max(2000).optional().nullable(),
  managerComment: z.string().max(2000).optional().nullable(),
})

// ============================================================
// Budget / Expense schemas (Module 5)
// ============================================================

export const expenseCategoryEnum = z.enum([
  'software',
  'hardware',
  'travel',
  'meals',
  'contractor',
  'marketing',
  'training',
  'other',
])

export const createExpenseSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(200),
  amount: z.number().min(0),
  currency: z.string().length(3).optional().default('INR'),
  category: expenseCategoryEnum.optional().default('other'),
  incurredDate: z.string().datetime(),
  vendor: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

export const updateExpenseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  amount: z.number().min(0).optional(),
  category: expenseCategoryEnum.optional(),
  vendor: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

export const createBudgetSchema = z.object({
  projectId: z.string().min(1),
  totalAmount: z.number().min(0),
  currency: z.string().length(3).optional().default('INR'),
  notes: z.string().max(2000).optional().nullable(),
})

// ============================================================
// Common
// ============================================================

export const idQuerySchema = z.object({
  id: z.string().min(1),
})

export const taskQuerySchema = z.object({
  projectId: z.string().optional(),
  status: z.string().optional(),
  assigneeId: z.string().optional(),
})

export const bookingQuerySchema = z.object({
  roomId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})
