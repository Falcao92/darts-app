let matches = [];
let currentMatch = null;
let currentInput = 1;

window.addEventListener("DOMContentLoaded", async () => {

  const ok = await ensureLogin();
  if (!ok) return;

  matches = await getList("Matches");

  // ✅ NUR Boards mit aktiven Matches
  const boards = [
    ...new Set(
      matches
        .filter(m =>
          m.fields &&
          m.fields.Status === "active" &&
          m.fields.BoardId
        )
        .map(m => m.fields.BoardId)
    )
  ];

  const sel = document.getElementById("boardSelect");
  sel.innerHTML = "";

  boards.forEach(b => {
    sel.innerHTML += `<option value="${b}">Board ${b}</option>`;
  });

  sel.addEventListener("change", loadMatch);

  createButtons();

  loadMatch();
});


// ✅ MATCH LADEN (MIT STATUS FILTER)
function loadMatch(){

  const board = document.getElementById("boardSelect").value;

  const activeMatches = matches.filter(m =>
    m.fields &&
    m.fields.BoardId == board &&
    m.fields.Status === "active" &&
    m.fields.Player1 &&
    m.fields.Player2
  );

  currentMatch = activeMatches[0];

  if(!currentMatch){
    set("players", "Kein aktives Spiel");
    set("score", "");
    set("turn", "");
    set("checkout", "");
    set("legs", "");
    return;
  }

  updateUI();
}


// ✅ UI aktualisieren
function updateUI(){

  const f = currentMatch.fields;

  set("players", `${f.Player1} vs ${f.Player2}`);
  set("score", `${f.Score1} : ${f.Score2}`);
  set("turn", "👉 " + (f.Turn === "p1" ? f.Player1 : f.Player2));
  set("legs", `Legs: ${f.Legs1 || 0} : ${f.Legs2 || 0}`);

  const score = f.Turn === "p1" ? f.Score1 : f.Score2;

  set("checkout", getCheckout(score));
}


// ✅ Safe Setter
function set(id, val){
  const el = document.getElementById(id);
  if(el) el.innerHTML = val;
}


// ✅ Dart Parsing
function parse(v){

  if(!v) return 0;

  v = v.toUpperCase().trim().replace(" ", "");

  if(v === "BULL") return 50;
  if(v === "25") return 25;

  if(v.startsWith("T")) return 3 * parseInt(v.slice(1));
  if(v.startsWith("D")) return 2 * parseInt(v.slice(1));

  return parseInt(v) || 0;
}


// ✅ Buttons erstellen
function createButtons(){

  const div = document.getElementById("buttons");
  div.innerHTML = "";

  for(let i = 1; i <= 20; i++){
    addButton(i, i);
    addButton("D"+i, "D"+i);
    addButton("T"+i, "T"+i);
  }

  addButton("25", "25");
  addButton("BULL", "BULL");
}


function addButton(label, value){

  const btn = document.createElement("button");

  btn.innerHTML = label;
  btn.className = "btn";

  btn.onclick = () => insertDart(value);

  document.getElementById("buttons").appendChild(btn);
}


// ✅ Dart setzen
function insertDart(value){

  if(currentInput === 1){
    d1.value = value;
    currentInput = 2;
  }
  else if(currentInput === 2){
    d2.value = value;
    currentInput = 3;
  }
  else{
    d3.value = value;
    currentInput = 1;
  }
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


  if(turn === "p1"){

    let ns = score1 - total;

    if(ns < 0 || ns === 1){
      turn = "p2"; // Bust
    }
    else if(ns === 0){

      legs1++;

      if(legs1 >= legsToWin){
        alert(f.Player1 + " gewinnt das Match!");
      }

      await updateMatch(id, 501, 501, "p2", legs1, legs2);
      resetInputs();
      return;
    }
    else{
      score1 = ns;
      turn = "p2";
    }
  }

  else{

    let ns = score2 - total;

    if(ns < 0 || ns === 1){
      turn = "p1";
    }
    else if(ns === 0){

      legs2++;

      if(legs2 >= legsToWin){
        alert(f.Player2 + " gewinnt das Match!");
      }

      await updateMatch(id, 501, 501, "p1", legs1, legs2);
      resetInputs();
      return;
    }
    else{
      score2 = ns;
      turn = "p1";
    }
  }

  await updateMatch(id, score1, score2, turn, legs1, legs2);

  resetInputs();

  matches = await getList("Matches");

  currentMatch = matches.find(m =>
    m.id === id &&
    m.fields.Status === "active"
  );

  updateUI();
}


// ✅ Reset
function resetInputs(){
  d1.value = "";
  d2.value = "";
  d3.value = "";
  currentInput = 1;
}


// ✅ Update
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


// ✅ Checkout
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
