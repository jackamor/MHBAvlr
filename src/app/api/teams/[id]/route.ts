import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      pointEntries: { include: { tournament: true }, orderBy: { createdAt: "desc" } },
      matchesAsA: { include: { teamB: true, tournament: true } },
      matchesAsB: { include: { teamA: true, tournament: true } },
    },
  });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(team);
}

const updateTeamSchema = z.object({
  logoUrl: z.string().max(500).nullable().optional(),
  name: z.string().min(1).optional(),
  tag: z.string().min(1).max(6).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const team = await prisma.team.update({ where: { id }, data: parsed.data });
  return NextResponse.json(team);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.team.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
