import { PrismaClient, Region } from "@prisma/client";

const prisma = new PrismaClient();

const REGIONS: Region[] = ["AMERICAS", "EUROPE", "CHINA", "APAC"];

const TEAM_NAMES: Record<Region, { name: string; tag: string }[]> = {
  AMERICAS: [
    { name: "Sentinels", tag: "SEN" },
    { name: "NRG Esports", tag: "NRG" },
    { name: "Evil Geniuses", tag: "EG" },
    { name: "LOUD", tag: "LOUD" },
  ],
  EUROPE: [
    { name: "Fnatic", tag: "FNC" },
    { name: "Team Heretics", tag: "TH" },
    { name: "Team Liquid", tag: "TL" },
    { name: "Karmine Corp", tag: "KC" },
  ],
  CHINA: [
    { name: "EDward Gaming", tag: "EDG" },
    { name: "Bilibili Gaming", tag: "BLG" },
    { name: "Titan Esports Club", tag: "TEC" },
    { name: "Dragon Ranger Gaming", tag: "DRG" },
  ],
  APAC: [
    { name: "Paper Rex", tag: "PRX" },
    { name: "DRX", tag: "DRX" },
    { name: "Gen.G", tag: "GENG" },
    { name: "Rex Regum Qeon", tag: "RRQ" },
  ],
};

async function main() {
  await prisma.pointEntry.deleteMany();
  await prisma.match.deleteMany();
  await prisma.tournamentTeam.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.team.deleteMany();

  for (const region of REGIONS) {
    for (const t of TEAM_NAMES[region]) {
      const team = await prisma.team.create({
        data: {
          name: t.name,
          tag: t.tag,
          region,
        },
      });

      // seed some placement points
      await prisma.pointEntry.create({
        data: {
          teamId: team.id,
          points: Math.floor(Math.random() * 300) + 50,
          placement: "Regular Season",
          note: "Seeded starting points",
        },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
