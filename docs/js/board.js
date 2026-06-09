const params = new URLSearchParams(window.location.search);
const boardId = params.get("board");

async function loadBoard() {
   await ensureLogin();
  refreshBoard();
}

async function refreshBoard() {
  const matches = await getMatches();
  const match = matches.find(m => m.fields.BoardId == boardId);

  if (!match) return;

  const f = match.fields;

  document.getElementById("match").innerHTML =
    `${f.Player1} vs ${f.Player2} <br>${f.Score1} : ${f.Score2}`;

  document.getElementById("turn").innerHTML =
    f.Turn === "p1"
      ? `👉 ${f.Player1} ist dran`
      : `👉 ${f.Player2} ist dran`;

  showCheckout(f.Score1);
}

// kein auto refresh
window.addEventListener("focus", refreshBoard);

loadBoard();
