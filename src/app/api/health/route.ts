import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getEnabledModules } from '@/lib/modules';

export async function GET() {
  try {
    // Simple DB check
    await db.$queryRaw`SELECT 1`;
    const moduleCount = getEnabledModules().length;

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      modulesEnabled: moduleCount,
      dbStatus: 'connected',
    });
  } catch (error) {
    return NextResponse.json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      error: 'Database check failed',
    }, { status: 500 });
  }
}
