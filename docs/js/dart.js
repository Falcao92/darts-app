function parseDart(input) {
  input = input.toUpperCase();

  if (input === "BULL") return 50;
  if (input === "25") return 25;

  const num = parseInt(input.slice(1));

  if (input.startsWith("T")) return num * 3;
  if (input.startsWith("D")) return num * 2;

  return parseInt(input) || 0;
}