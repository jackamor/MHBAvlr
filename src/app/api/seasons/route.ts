import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSeasonSchema = z.object({
  label: z.string().min(1).max(100),
});

export async function GET() {
  const seasons = await prisma.season.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      events: {
        include: {
          tournament: true,
          championTeam: true,
        },
      },
    },
  });
  return NextResponse.json(seasons);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createSeasonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const season = await prisma.season.create({ data: { label: parsed.data.label } });
  return NextResponse.json(season, { status: 201 });
}
