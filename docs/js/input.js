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


function loadMatch(){

  const board = document.getElementById("boardSelect").value;

  currentMatch = matches.find(m => m.fields.BoardId == board);

  if(!currentMatch){
    document.getElementById("players").innerHTML = "Kein Spiel";
    return;
  }

  updateUI();
}


function updateUI(){

  const f = currentMatch.fields;

  document.getElementById("players").innerHTML =
    `${f.Player1} vs ${f.Player2}`;

  document.getElementById("score").innerHTML =
    `${f.Score1} : ${f.Score2}`;

  document.getElementById("turn").innerHTML =
    "👉 " + (f.Turn === "p1" ? f.Player1 : f.Player2);

  const score = f.Turn === "p1" ? f.Score1 : f.Score2;

  document.getElementById("checkout").innerHTML =
    getCheckout(score);
}


function parse(v){
  if(!v) return 0;

  v = v.toUpperCase();

  if(v==="BULL") return 50;
  if(v==="25") return 25;

  if(v.startsWith("T")) return 3*parseInt(v.slice(1));
  if(v.startsWith("D")) return 2*parseInt(v.slice(1));

  return parseInt(v)||0;
}


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

  let turn = f.Turn;

  if(turn === "p1"){

    if(score1 - total >= 0){
      score1 -= total;
      turn = "p2";
    }

  } else {

    if(score2 - total >= 0){
      score2 -= total;
      turn = "p1";
    }
  }

  await updateMatch(id, score1, score2, turn);

  d1.value = "";
  d2.value = "";
  d3.value = "";

  matches = await getList("Matches");
  currentMatch = matches.find(m => m.id === id);

  updateUI();
}


async function updateMatch(id, s1, s2, turn){

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
      Turn:turn
    })
  });
}

function getCheckout(score){

  const map = {
    170:"T20 T20 Bull",
    167:"T20 T19 Bull",
    100:"T20 D20",
    80:"T20 D10",
    60:"20 D20",
    40:"D20",
    32:"D16",
    16:"D8",
    8:"D4"
  };

  return map[score] || "";
}
