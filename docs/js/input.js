let matches = [];
let currentMatch = null;
let currentInput = 1;

window.addEventListener("DOMContentLoaded", async () => {

  const ok = await ensureLogin();
  if (!ok) return;

  matches = await getList("Matches");

  const boards = [...new Set(matches.map(m => m.fields.BoardId))];

  const sel = document.getElementById("boardSelect");
  sel.innerHTML = "";

  boards.forEach(b => {
    sel.innerHTML += `<option value="${b}">Board ${b}</option>`;
  });

  sel.addEventListener("change", loadMatch);

  createButtons();
  loadMatch();
});


// ==========================
// MATCH LADEN
// ==========================
function loadMatch(){

  const board = document.getElementById("boardSelect").value;

  currentMatch = matches.find(m =>
    m.fields &&
    m.fields.BoardId == board &&
    m.fields.Status === "active"
  );

  if(!currentMatch){
    set("players", "Kein aktives Spiel");
    return;
  }

  updateUI();
}


// ==========================
// UI
// ==========================
function updateUI(){

  const f = currentMatch.fields;

  set("players", `${f.Player1} vs ${f.Player2}`);
  set("score", `${f.Score1} : ${f.Score2}`);
  set("turn", "👉 " + (f.Turn === "p1" ? f.Player1 : f.Player2));
  set("legs", `Legs ${f.Legs1 || 0} : ${f.Legs2 || 0}`);
}


// ==========================
// HELPERS
// ==========================
function set(id, val){
  const el = document.getElementById(id);
  if(el) el.innerHTML = val;
}

function parse(v){
  if(!v) return 0;

  v = v.toUpperCase().trim();

  if(v === "BULL") return 50;
  if(v === "25") return 25;

  if(v.startsWith("T")) return 3 * parseInt(v.slice(1));
  if(v.startsWith("D")) return 2 * parseInt(v.slice(1));

  return parseInt(v) || 0;
}

function isDouble(v){
  return v && v.toUpperCase().startsWith("D");
}


// ==========================
// BUTTONS
// ==========================
function createButtons(){

  const div = document.getElementById("buttons");
  div.innerHTML = "";

  for(let i = 1; i <= 20; i++){
    addButton(i);
    addButton("D"+i);
    addButton("T"+i);
  }

  addButton("25");
  addButton("BULL");
}

function addButton(value){

  const btn = document.createElement("button");

  btn.innerText = value;
  btn.onclick = () => insertDart(value);

  document.getElementById("buttons").appendChild(btn);
}


// ==========================
// INPUT FLOW
// ==========================
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


// ==========================
// SUBMIT (Richtig getrennt Leg / Match)
// ==========================
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
  let turn = f.Turn;

  const lastDart = d3.value || d2.value || d1.value;
  const legsToWin = f.LegsToWin || 3;


  // ================= PLAYER 1 =================
  if(turn === "p1"){

    let ns = score1 - total;

    if(ns < 0 || ns === 1){
      turn = "p2";
    }

    else if(ns === 0 && isDouble(lastDart)){

      legs1++;
      alert(f.Player1 + " gewinnt das Leg!");

      // ✅ MATCH GEWONNEN?
      if(legs1 >= legsToWin){

        alert(f.Player1 + " gewinnt das MATCH!");

        await updateMatch(id, 501, 501, "p2", legs1, legs2, f.Player1);

      } else {

        // ✅ NUR LEG RESET
        await updateMatch(id, 501, 501, "p2", legs1, legs2);

      }

      resetInputs();
      await reloadMatch(id);
      return;
    }

    else if(ns === 0){
      turn = "p2";
    }

    else{
      score1 = ns;
      turn = "p2";
    }
  }


  // ================= PLAYER 2 =================
  else{

    let ns = score2 - total;

    if(ns < 0 || ns === 1){
      turn = "p1";
    }

    else if(ns === 0 && isDouble(lastDart)){

      legs2++;
      alert(f.Player2 + " gewinnt das Leg!");

      if(legs2 >= legsToWin){

        alert(f.Player2 + " gewinnt das MATCH!");

        await updateMatch(id, 501, 501, "p1", legs1, legs2, f.Player2);

      } else {

        await updateMatch(id, 501, 501, "p1", legs1, legs2);

      }

      resetInputs();
      await reloadMatch(id);
      return;
    }

    else if(ns === 0){
      turn = "p1";
    }

    else{
      score2 = ns;
      turn = "p1";
    }
  }

  await updateMatch(id, score1, score2, turn, legs1, legs2);

  resetInputs();
  await reloadMatch(id);
}


// ==========================
// RELOAD MATCH
// ==========================
async function reloadMatch(id){
  matches = await getList("Matches");
  currentMatch = matches.find(m => m.id === id);
  updateUI();
}


// ==========================
// RESET INPUTS
// ==========================
function resetInputs(){
  d1.value = "";
  d2.value = "";
  d3.value = "";
  currentInput = 1;
}


// ==========================
// UPDATE MATCH
// ==========================
async function updateMatch(id, s1, s2, turn, legs1, legs2, winner){

  const token = await getToken();

  const status = winner ? "finished" : "active";

await fetch(
  `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${id}/fields`,
{
  method:"PATCH",
  headers:{
    Authorization:`Bearer ${token}`,
    "Content-Type":"application/json"
  },
  body:JSON.stringify({
    Score1: s1,
    Score2: s2,
    Turn: turn,
    Legs1: legs1,
    Legs2: legs2,
    Winner: winner || "",
    Status: status
  })
});

  // ✅ NUR BEI MATCH ENDE
  if(winner){
    await activateNextMatch(currentMatch.fields.BoardId);
  }
}


// ==========================
// AUTO NEXT MATCH
// ==========================
async function activateNextMatch(boardId){

  const token = await getToken();
  const matches = await getList("Matches");

  const next = matches.find(m =>
    m.fields &&
    m.fields.BoardId == boardId &&
    m.fields.Status === "waiting"
  );

  if(!next) return;

  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${next.id}/fields`,
  {
    method:"PATCH",
    headers:{
      Authorization:`Bearer ${token}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      Status: "active"
    })
  });
}
