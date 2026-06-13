const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");

const root = path.resolve(__dirname, "..");
const pdfPath = path.join(root, "supabase", "seed", "SquadLists-Spanish.pdf");
const outputPath = path.join(root, "supabase", "seed", "006_players_fifa_squadlists.sql");
const textOutputPath = path.join(root, "supabase", "seed", "SquadLists-Spanish.txt");
const sourceUrl = "https://fdp.fifa.org/assetspublic/ce281/pdf/SquadLists-Spanish.pdf";

const expectedTeamCodes = new Set([
  "ALG",
  "ARG",
  "AUS",
  "AUT",
  "BEL",
  "BIH",
  "BRA",
  "CAN",
  "CIV",
  "COD",
  "COL",
  "CPV",
  "CRO",
  "CUW",
  "CZE",
  "ECU",
  "EGY",
  "ENG",
  "ESP",
  "FRA",
  "GER",
  "GHA",
  "HAI",
  "IRN",
  "IRQ",
  "JOR",
  "JPN",
  "KOR",
  "KSA",
  "MAR",
  "MEX",
  "NED",
  "NOR",
  "NZL",
  "PAN",
  "PAR",
  "POR",
  "QAT",
  "RSA",
  "SCO",
  "SEN",
  "SUI",
  "SWE",
  "TUN",
  "TUR",
  "URU",
  "USA",
  "UZB"
]);

const positionMap = new Map([
  ["PO", "goalkeeper"],
  ["DF", "defender"],
  ["MC", "attacking_midfielder"],
  ["DC", "forward"]
]);

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function sql(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function findTeams(text) {
  const matches = [];
  const regex = /^(.+?) \(([A-Z]{3})\)$/gm;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const code = match[2];
    if (!expectedTeamCodes.has(code)) continue;
    matches.push({ code, name: match[1], index: match.index });
  }

  return matches.sort((a, b) => a.index - b.index);
}

function parsePlayerName(rowText) {
  const dateIndex = rowText.search(/\d{1,2}\/\d{1,2}\/\d{4}/);
  const beforeDate = dateIndex >= 0 ? rowText.slice(0, dateIndex) : rowText;
  const clean = beforeDate.replace(/\s+/g, " ").trim();
  const surnameThenGiven = clean.match(/^([\p{Lu} '.-]+ [\p{Lu}][\p{Ll}'’.-]+)(?=\p{Lu})/u);
  if (surnameThenGiven) return surnameThenGiven[1].trim();

  const uppercaseDisplayName = clean.match(/^([\p{Lu}0-9 '.-]+?)(?=\p{Lu}\p{Ll})/u);
  if (uppercaseDisplayName) return uppercaseDisplayName[1].trim();

  return clean.trim();
}

function parsePlayersFromBlock(block, teamCode) {
  const lines = block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const players = [];

  for (const line of lines) {
    const match = line.match(/^(PO|DF|MC|DC)(.+)$/);
    if (!match) continue;

    const position = positionMap.get(match[1]);
    const fullName = parsePlayerName(match[2]);
    if (!position) continue;

    players.push({
      teamCode,
      fullName,
      position,
      shirtNumber: players.length + 1
    });
  }

  return players;
}

async function main() {
  const buffer = fs.readFileSync(pdfPath);
  const parsed = await pdf(buffer);
  const text = parsed.text;
  fs.writeFileSync(textOutputPath, text, "utf8");

  const uniqueTeams = findTeams(text);

  const players = [];
  for (let i = 0; i < uniqueTeams.length; i += 1) {
    const current = uniqueTeams[i];
    const next = uniqueTeams[i + 1];
    const block = text.slice(current.index, next ? next.index : text.length);
    players.push(...parsePlayersFromBlock(block, current.code));
  }

  const byTeam = players.reduce((acc, player) => {
    acc[player.teamCode] = (acc[player.teamCode] ?? 0) + 1;
    return acc;
  }, {});

  const missingTeams = [...expectedTeamCodes].filter((code) => !byTeam[code]);
  const suspiciousTeams = Object.entries(byTeam).filter(([, count]) => count < 20 || count > 30);

  const values = players
    .map(
      (player) =>
        `    (${sql(player.teamCode)}, ${sql(player.fullName)}, ${sql(player.position)}, ${player.shirtNumber}, ${sql(sourceUrl)})`
    )
    .join(",\n");

  const output = `-- Jugadores extraidos de la lista oficial FIFA en espanol.\n-- Fuente: ${sourceUrl}\n-- Generado por scripts/generate-players-seed.cjs\n\nwith source(team_code, full_name, position, shirt_number, source_url) as (\n  values\n${values}\n)\ninsert into players (team_id, full_name, position, shirt_number, source_url, is_active)\nselect t.id, s.full_name, s.position::player_position, s.shirt_number, s.source_url, true\nfrom source s\njoin teams t on t.code = s.team_code\non conflict (team_id, full_name) do update set\n  position = excluded.position,\n  shirt_number = excluded.shirt_number,\n  source_url = excluded.source_url,\n  is_active = true;\n`;

  fs.writeFileSync(outputPath, output, "utf8");
  console.log(JSON.stringify({ teams: Object.keys(byTeam).length, players: players.length, missingTeams, suspiciousTeams }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
