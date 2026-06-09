const params = new URLSearchParams(window.location.search);
const boardId = params.get("board");

window.addEventListener("DOMContentLoaded", async () => {
  const ok = await ensureLogin();
  if (!ok) return;

  loadBoard();
});

async function loadBoard() {
  const matches = await getList("Matches");

  const match = matches.find(m => m.fields.BoardId == boardId);

  if (!match) {
    document.getElementById("content").innerHTML = "Kein Match";
    return;
  }

  const f = match.fields;

  document.getElementById("content").innerHTML = `
    <h2>${f.Player1} vs ${f.Player2}</h2>
    <h1>${f.Score1} : ${f.Score2}</h1>
    <h2>${f.Turn === "p1" ? f.Player1 : f.Player2} ist dran</h2>
    <h3>${getCheckout(f.Turn === "p1" ? f.Score1 : f.Score2)}</h3>
  `;
}


function getCheckout(score) {
  const map = {
    170:"T20 T20 Bull",
    100:"T20 D20",
    80:"T20 D10",
    40:"D20",
    32:"D16"
  };
  return map[score] || "";
}
