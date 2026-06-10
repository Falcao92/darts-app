const params = new URLSearchParams(window.location.search);
const boardId = params.get("board");

let currentMatch = null;


// ==========================
// START
// ==========================
window.addEventListener("DOMContentLoaded", async () => {

  const ok = await ensureLogin();
  if (!ok) return;

  loadBoard();

  setInterval(loadBoard, 2000);
});


// ==========================
// MATCH LADEN
// ==========================
async function loadBoard(){

  const matches = await getList("Matches");

  // ✅ NUR AKTIVES MATCH DIESES BOARDS
  const activeMatches = matches.filter(m =>
    m.fields &&
    m.fields.BoardId == boardId &&
    m.fields.Status === "active"
  );

  // ✅ Sicherstellen: nur 1 Match
  currentMatch = activeMatches.length > 0 ? activeMatches[0] : null;

  if(!currentMatch){
    set("score", "Kein Spiel");
    set("legs", "");
    set("checkout", "");
    return;
  }

  updateUI();
}


// ==========================
// UI UPDATE
// ==========================
function updateUI(){

  if(!currentMatch || !currentMatch.fields) return;

  const f = currentMatch.fields;

  // ✅ Board
  set("boardLabel", "Board " + f.BoardId);

  // ✅ Spieler
  set("p1", f.Player1);
  set("p2", f.Player2);

  // ✅ Score
  set("score", `${f.Score1} : ${f.Score2}`);

  // ✅ Legs (FIX!)
  set("legs", `${f.Legs1 || 0} : ${f.Legs2 || 0}`);

  // ✅ aktiver Spieler
  highlightTurn(f);

  // ✅ Checkout Anzeige
  const score = f.Turn === "p1" ? f.Score1 : f.Score2;

  const checkout = getCheckout(score);

  set("checkout", checkout ? "Checkout: " + checkout : "");
}


// ==========================
// TURN HIGHLIGHT
// ==========================
function highlightTurn(f){

  const p1 = document.getElementById("p1");
  const p2 = document.getElementById("p2");

  p1.classList.remove("active");
  p2.classList.remove("active");

  if(f.Turn === "p1"){
    p1.classList.add("active");
  } else {
    p2.classList.add("active");
  }
}


// ==========================
// SET HELPER
// ==========================
function set(id, value){

  const el = document.getElementById(id);
  if(el) el.innerHTML = value;
}


// ==========================
// CHECKOUT LOGIK
// ==========================
function getCheckout(score){

  if(score > 170) return "";

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
