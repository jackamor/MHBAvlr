import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { completeMatchFromScore } from "@/lib/matchAdvance";

const updateMatchSchema = z.object({
  teamAScore: z.coerce.number().int().min(0).optional(),
  teamBScore: z.coerce.number().int().min(0).optional(),
  scheduledAt: z.string().optional(),
  status: z.enum(["SCHEDULED", "LIVE", "COMPLETED"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateMatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.match.update({
    where: { id },
    data: {
      ...(parsed.data.teamAScore !== undefined && { teamAScore: parsed.data.teamAScore }),
      ...(parsed.data.teamBScore !== undefined && { teamBScore: parsed.data.teamBScore }),
      ...(parsed.data.scheduledAt && { scheduledAt: new Date(parsed.data.scheduledAt) }),
      ...(parsed.data.status && { status: parsed.data.status }),
    },
  });

  const updated = await completeMatchFromScore(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Clear dangling references from any matches that fed into this one.
  await prisma.match.updateMany({
    where: { nextMatchId: id },
    data: { nextMatchId: null, nextMatchSlot: null },
  });
  await prisma.match.updateMany({
    where: { nextLoserMatchId: id },
    data: { nextLoserMatchId: null, nextLoserMatchSlot: null },
  });
  await prisma.match.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
