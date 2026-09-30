import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createChampionshipSchema = z.object({
  teamId: z.string().min(1),
  title: z.enum([
    "WORLDS",
    "MSI",
    "MHBA",
    "APAC_CHAMPION",
    "AMERICAS_CHAMPION",
    "CHINA_CHAMPION",
    "EUROPE_CHAMPION",
    "POINTS_CHAMPION",
  ]),
  year: z.coerce.number().int().optional(),
});

export async function GET() {
  const championships = await prisma.championship.findMany({
    include: { team: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(championships);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createChampionshipSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const championship = await prisma.championship.create({ data: parsed.data });
  return NextResponse.json(championship, { status: 201 });
}
