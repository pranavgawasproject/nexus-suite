import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEnabledModules } from '@/lib/modules';

export async function GET() {
  try {
    // Simple DB check
    await prisma.$queryRaw`SELECT 1`;
    const moduleCount = Object.keys(getEnabledModules()).length;

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
