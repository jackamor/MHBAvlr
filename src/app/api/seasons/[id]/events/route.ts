import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const upsertEventSchema = z.object({
  title: z.enum(["WORLDS", "MSI", "MASTERS", "MHBA"]),
  tournamentId: z.string().nullable().optional(),
  championTeamId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const parsed = upsertEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { title, tournamentId, championTeamId } = parsed.data;

  const event = await prisma.seasonEvent.upsert({
    where: { seasonId_title: { seasonId: id, title } },
    create: {
      seasonId: id,
      title,
      tournamentId: tournamentId || null,
      championTeamId: championTeamId || null,
    },
    update: {
      tournamentId: tournamentId || null,
      championTeamId: championTeamId || null,
    },
    include: { tournament: true, championTeam: true },
  });

  return NextResponse.json(event, { status: 201 });
}
