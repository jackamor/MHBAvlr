import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      teams: { include: { team: { include: { championships: true } } }, orderBy: { seed: "asc" } },
      matches: {
        include: {
          teamA: { include: { championships: true } },
          teamB: { include: { championships: true } },
          winner: true,
        },
        // Preserve creation order (the order the bracket generator produced them
        // in) rather than sorting by roundName, since names like "Bracket Final"
        // would otherwise sort alphabetically before "Lower Round 5" and jump
        // the bracket-final column ahead of later lower-bracket rounds.
        orderBy: [{ section: "asc" }],
      },
    },
  });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tournament);
}

const updateTournamentSchema = z.object({
  logoUrl: z.string().max(500).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateTournamentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const tournament = await prisma.tournament.update({ where: { id }, data: parsed.data });
  return NextResponse.json(tournament);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.tournament.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
