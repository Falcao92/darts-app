let matches = [];
let currentMatch = null;

window.addEventListener("DOMContentLoaded", async () => {

  const ok = await ensureLogin();
  if (!ok) return;

  matches = await getList("Matches");

  const boards = [...new Set(matches.map(m => m.fields.BoardId))];

  const sel = document.getElementById("boardSelect");

  boards.forEach(b => {
    sel.innerHTML += `<option value="${b}">Board ${b}</option>`;
  });

  sel.addEventListener("change", loadMatch);

  loadMatch();
});


// ✅ Match laden
function loadMatch(){

  const board = document.getElementById("boardSelect").value;

  currentMatch = matches.find(m => m.fields.BoardId == board);

  if(!currentMatch){
    document.getElementById("players").innerHTML = "Kein Spiel";
    return;
  }

  updateUI();
}


// ✅ UI aktualisieren
function updateUI(){

  const f = currentMatch.fields;

  document.getElementById("players").innerHTML =
    `${f.Player1} vs ${f.Player2}`;

  document.getElementById("score").innerHTML =
    `${f.Score1} : ${f.Score2}`;

  document.getElementById("turn").innerHTML =
    "👉 " + (f.Turn === "p1" ? f.Player1 : f.Player2);

  document.getElementById("legs").innerHTML =
    `Legs: ${f.Legs1 || 0} : ${f.Legs2 || 0}`;

  const score = f.Turn === "p1" ? f.Score1 : f.Score2;

  document.getElementById("checkout").innerHTML =
    getCheckout(score);
}


// ✅ Dart Parsing
function parse(v){

  if(!v) return 0;

  v = v.toUpperCase();

  if(v==="BULL") return 50;
  if(v==="25") return 25;

  if(v.startsWith("T")) return 3*parseInt(v.slice(1));
  if(v.startsWith("D")) return 2*parseInt(v.slice(1));

  return parseInt(v)||0;
}


// ✅ Hauptlogik
async function submit(){

  if(!currentMatch) return;

  const total =
    parse(d1.value) +
    parse(d2.value) +
    parse(d3.value);

  const id = currentMatch.id;
  const f = currentMatch.fields;

  let score1 = f.Score1;
  let score2 = f.Score2;

  let legs1 = f.Legs1 || 0;
  let legs2 = f.Legs2 || 0;

  let legsToWin = f.LegsToWin || 3;

  let turn = f.Turn;


  // 🎯 PLAYER 1
  if(turn === "p1"){

    let newScore = score1 - total;

    // ❌ Bust
    if(newScore < 0 || newScore === 1){
      turn = "p2";
    }

    // ✅ LEG GEWONNEN
    else if(newScore === 0){

      legs1++;

      // ✅ Match gewonnen?
      if(legs1 >= legsToWin){
        alert(f.Player1 + " gewinnt das Match!");
      }

      await updateMatch(id, 501, 501, "p2", legs1, legs2);
      return;
    }

    // ✅ normaler Wurf
    else {
      score1 = newScore;
      turn = "p2";
    }
  }


  // 🎯 PLAYER 2
  else {

    let newScore = score2 - total;

    if(newScore < 0 || newScore === 1){
      turn = "p1";
    }

    else if(newScore === 0){

      legs2++;

      if(legs2 >= legsToWin){
        alert(f.Player2 + " gewinnt das Match!");
      }

      await updateMatch(id, 501, 501, "p1", legs1, legs2);
      return;
    }

    else {
      score2 = newScore;
      turn = "p1";
    }
  }


  await updateMatch(id, score1, score2, turn, legs1, legs2);

  d1.value = "";
  d2.value = "";
  d3.value = "";

  matches = await getList("Matches");
  currentMatch = matches.find(m => m.id === id);

  updateUI();
}


// ✅ SharePoint Update
async function updateMatch(id, s1, s2, turn, legs1, legs2){

  const token = await getToken();

  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${id}/fields`,
  {
    method:"PATCH",
    headers:{
      Authorization:`Bearer ${token}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      Score1:s1,
      Score2:s2,
      Turn:turn,
      Legs1:legs1,
      Legs2:legs2
    })
  });
}


// ✅ Checkout Tabelle
function getCheckout(score){

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
