const params = new URLSearchParams(window.location.search);
const boardId = params.get("board");

let currentMatch = null;

window.addEventListener("DOMContentLoaded", async () => {

  const ok = await ensureLogin();
  if (!ok) return;

  loadBoard();

  // 🔥 AUTO REFRESH alle 2 Sekunden (live feeling!)
  setInterval(loadBoard, 2000);
});


async function loadBoard(){

  const matches = await getList("Matches");

  currentMatch = matches.find(m => m.fields.BoardId == boardId);

  if(!currentMatch){
    document.body.innerHTML = "<h1>Kein Spiel auf diesem Board</h1>";
    return;
  }

  updateUI();
}


function updateUI(){

  const f = currentMatch.fields;

  document.getElementById("boardLabel").innerHTML =
    "Board " + f.BoardId;

  document.getElementById("p1").innerHTML =
    f.Player1;

  document.getElementById("p2").innerHTML =
    f.Player2;

  document.getElementById("score").innerHTML =
    `${f.Score1} : ${f.Score2}`;

  // ✅ Aktiver Spieler highlighten
  highlightTurn(f);

  // ✅ Checkout anzeigen
  const score = f.Turn === "p1" ? f.Score1 : f.Score2;

  document.getElementById("checkout").innerHTML =
    getCheckout(score);
}


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


function getCheckout(score){

  const map = {
    170:"T20 T20 Bull",
    167:"T20 T19 Bull",
    164:"T20 T18 Bull",
    161:"T20 T17 Bull",
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
