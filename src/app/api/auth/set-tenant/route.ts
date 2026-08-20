import { auth, signIn } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "Superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId required" }, { status: 400 });
    }

    // Verify tenant exists and is active
    const tenant = await prisma.tenant.findUnique({
      where: { id: parseInt(tenantId) },
      select: { id: true, isActive: true },
    });

    if (!tenant || !tenant.isActive) {
      return NextResponse.json({ error: "Tenant not found or inactive" }, { status: 404 });
    }

    // Re-sign in with the selected tenant
    // We'll update the JWT token by triggering a session update
    // For now, redirect to the dashboard with tenant context
    // The proper way is to update the session callback

    return NextResponse.json({
      success: true,
      redirectUrl: `/dashboard/tenant/${tenantId}/beranda`,
    });
  } catch (error) {
    console.error("Set tenant error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}