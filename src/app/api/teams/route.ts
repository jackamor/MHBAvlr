import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createTeamSchema = z.object({
  name: z.string().min(1),
  tag: z.string().min(1).max(6),
  region: z.enum(["CHINA", "EUROPE", "AMERICAS", "APAC"]),
  logoUrl: z.string().max(500).optional().or(z.literal("")),
});

export async function GET(request: NextRequest) {
  const region = request.nextUrl.searchParams.get("region");
  const teams = await prisma.team.findMany({
    where: region ? { region: region as never } : undefined,
    include: { pointEntries: true, championships: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(teams);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const team = await prisma.team.create({
    data: {
      name: parsed.data.name,
      tag: parsed.data.tag,
      region: parsed.data.region,
      logoUrl: parsed.data.logoUrl || null,
    },
  });
  return NextResponse.json(team, { status: 201 });
}
