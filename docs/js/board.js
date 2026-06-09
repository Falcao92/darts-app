// 👉 Board aus URL lesen
const params = new URLSearchParams(window.location.search);
const boardId = params.get("board");

let currentMatch = null;


// ✅ Seite starten
window.addEventListener("DOMContentLoaded", async () => {

  const ok = await ensureLogin();
  if (!ok) return;

  console.log("Board geladen:", boardId);

  await loadBoard();

  // 🔥 Auto Refresh (Live Anzeige)
  setInterval(loadBoard, 2000);
});


// ✅ Match laden
async function loadBoard() {

  const matches = await getList("Matches");

  console.log("Alle Matches:", matches);

  if (!matches || matches.length === 0) {
    set("score", "Keine Matches vorhanden");
    return;
  }

  currentMatch = matches.find(m => m.fields.BoardId == boardId);

  console.log("Gefundenes Match:", currentMatch);

  if (!currentMatch) {
    set("score", "Kein Spiel auf Board " + boardId);
    return;
  }

  updateUI();
}


// ✅ UI aktualisieren
function updateUI() {

  if (!currentMatch || !currentMatch.fields) return;

  const f = currentMatch.fields;
set("legs", `${f.Legs1 || 0} : ${f.Legs2 || 0}`);
  set("boardLabel", "Board " + f.BoardId);
  set("p1", f.Player1 || "-");
  set("p2", f.Player2 || "-");

  set("score", `${f.Score1} : ${f.Score2}`);

  highlightTurn(f);

  const score = f.Turn === "p1" ? f.Score1 : f.Score2;

  set("checkout", getCheckout(score));
}


// ✅ Spieler hervorheben
function highlightTurn(f) {

  const p1 = document.getElementById("p1");
  const p2 = document.getElementById("p2");

  if (!p1 || !p2) return;

  p1.classList.remove("active");
  p2.classList.remove("active");

  if (f.Turn === "p1") {
    p1.classList.add("active");
  } else {
    p2.classList.add("active");
  }
}


// ✅ Sichere Ausgabe (verhindert deine Fehler!)
function set(id, value) {

  const el = document.getElementById(id);

  if (!el) {
    console.error("Element fehlt:", id);
    return;
  }

  el.innerHTML = value;
}


// ✅ Checkout Tabelle
function getCheckout(score) {

  const map = {
    170:"T20 T20 Bull",
    167:"T20 T19 Bull",
    164:"T20 T18 Bull",
    161:"T20 T17 Bull",
    160:"T20 T20 D20",
    140:"T20 T20 D10",
    120:"T20 20 D20",
    100:"T20 D20",
    80:"T20 D10",
    60:"20 D20",
    50:"10 D20",
    40:"D20",
    32:"D16",
    24:"D12",
    16:"D8",
    8:"D4"
  };

  return map[score] || "";
}
