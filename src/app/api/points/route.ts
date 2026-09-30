import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createPointEntrySchema = z.object({
  teamId: z.string().optional(),
  teamIds: z.array(z.string().min(1)).optional(),
  tournamentId: z.string().optional().or(z.literal("")),
  points: z.coerce.number().int(),
  placement: z.string().min(1),
  note: z.string().optional(),
});

export async function GET() {
  const entries = await prisma.pointEntry.findMany({
    include: { team: true, tournament: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createPointEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const teamIds = parsed.data.teamIds?.length ? parsed.data.teamIds : parsed.data.teamId ? [parsed.data.teamId] : [];
  if (teamIds.length === 0) {
    return NextResponse.json({ error: "At least one team is required" }, { status: 400 });
  }
  const result = await prisma.pointEntry.createMany({
    data: teamIds.map((teamId) => ({
      teamId,
      tournamentId: parsed.data.tournamentId || null,
      points: parsed.data.points,
      placement: parsed.data.placement,
      note: parsed.data.note || null,
    })),
  });
  return NextResponse.json({ ok: true, count: result.count }, { status: 201 });
}

export async function DELETE() {
  const result = await prisma.pointEntry.deleteMany();
  return NextResponse.json({ ok: true, count: result.count });
}
