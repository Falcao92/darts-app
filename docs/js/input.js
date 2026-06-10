let matches = [];
let currentMatch = null;
let currentInput = 1;

window.addEventListener("DOMContentLoaded", async () => {

  const ok = await ensureLogin();
  if (!ok) return;

  await refreshMatches();

  const boards = [...new Set(matches.map(m => m.fields.BoardId))];

  const sel = document.getElementById("boardSelect");
  if(!sel) return;

  sel.innerHTML = "";

  boards.forEach(b => {
    sel.innerHTML += `<option value="${b}">Board ${b}</option>`;
  });

  sel.addEventListener("change", loadMatch);

  createButtons(); // ✅ war kaputt
  loadMatch();
});


// ==========================
// ✅ BUTTONS (FIX)
// ==========================
function createButtons(){

  const div = document.getElementById("buttons");
  if(!div) return;

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
// MATCH LADEN
// ==========================
function loadMatch(){

  const boardEl = document.getElementById("boardSelect");
  if(!boardEl) return;

  const board = boardEl.value;

  currentMatch = matches.find(m =>
    m.fields &&
    m.fields.BoardId == board &&
    m.fields.Status === "active"
  );

  if(!currentMatch){
    set("players", "Kein aktives Spiel");
    set("score", "-");
    set("turn", "-");
    set("legs", "-");
    return;
  }

  updateUI();
}


// ==========================
function updateUI(){

  if(!currentMatch) return;

  const f = currentMatch.fields;

  set("players", `${f.Player1} vs ${f.Player2}`);
  set("score", `${f.Score1} : ${f.Score2}`);
  set("turn", "👉 " + (f.Turn === "p1" ? f.Player1 : f.Player2));
  set("legs", `Legs ${f.Legs1 || 0} : ${f.Legs2 || 0}`);
}


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
// INPUT
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
// SUBMIT
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
  const legsToWin = parseInt(f.LegsToWin) || 3;


  if(turn === "p1"){

    let ns = score1 - total;

    if(ns === 0 && isDouble(lastDart)){

      legs1++;

      if(legs1 >= legsToWin){
        await updateMatch(id, 501, 501, "p2", legs1, legs2, f.Player1);
      } else {
        await updateMatch(id, 501, 501, "p2", legs1, legs2);
      }

      resetInputs();
      await reloadMatch(id);
      return;
    }

    score1 = (ns < 0 || ns === 1) ? score1 : ns;
    turn = "p2";
  }
  else{

    let ns = score2 - total;

    if(ns === 0 && isDouble(lastDart)){

      legs2++;

      if(legs2 >= legsToWin){
        await updateMatch(id, 501, 501, "p1", legs1, legs2, f.Player2);
      } else {
        await updateMatch(id, 501, 501, "p1", legs1, legs2);
      }

      resetInputs();
      await reloadMatch(id);
      return;
    }

    score2 = (ns < 0 || ns === 1) ? score2 : ns;
    turn = "p1";
  }

  await updateMatch(id, score1, score2, turn, legs1, legs2);

  resetInputs();
  await reloadMatch(id);
}


// ==========================
async function updateMatch(id, s1, s2, turn, legs1, legs2, winner){

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
        Score1: s1,
        Score2: s2,
        Turn: turn,
        Legs1: legs1,
        Legs2: legs2,
        Winner: winner || "",
        Status: winner ? "finished" : "active"
      })
    }
  );

  if(winner){
    await refreshMatches();
    await checkAndStartKO();
  }
}


// ==========================
// KO AUTO FIX
// ==========================
async function checkAndStartKO(){

  await refreshMatches();

  const groupMatches = matches.filter(m =>
    m.fields && m.fields.Round === "group"
  );

  if(groupMatches.length === 0) return;

  const stillOpen = groupMatches.some(m =>
    m.fields.Status !== "finished"
  );

  if(stillOpen) return;

  const hasKO = matches.some(m =>
    m.fields.Round !== "group"
  );

  if(hasKO) return;

  await createKOFromFinishedGroups();
}


// ==========================
async function createKOFromFinishedGroups(){

  let groups = {};

  matches.forEach(m => {

    const f = m.fields;
    if(f.Round !== "group") return;

    if(!groups[f.Group]) groups[f.Group] = {};

    if(!groups[f.Group][f.Player1]) groups[f.Group][f.Player1] = 0;
    if(!groups[f.Group][f.Player2]) groups[f.Group][f.Player2] = 0;

    if(f.Winner){
      groups[f.Group][f.Winner] += 2;
    }
  });

  let qualified = [];

  Object.values(groups).forEach(group => {

    const sorted = Object.entries(group)
      .sort((a,b)=>b[1]-a[1]);

    qualified.push(sorted[0][0]);
    if(sorted[1]) qualified.push(sorted[1][0]);
  });

  const boardCount = parseInt(localStorage.getItem("boardCount")) || 1;

  await createKOBracket(qualified, boardCount);
}


// ==========================
async function createKOBracket(players, boardCount){

  const token = await getToken();
  let board = 1;

  for(let i=0;i<players.length;i+=2){

    await fetch(
      `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items`,
    {
      method:"POST",
      headers:{
        Authorization:`Bearer ${token}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        fields:{
          Title: players[i] + " vs " + players[i+1],
          Player1: players[i],
          Player2: players[i+1],
          Score1: 501,
          Score2: 501,
          Legs1: 0,
          Legs2: 0,
          LegsToWin: 3,
          BoardId: String(board),
          Turn: "p1",
          Status: "active",
          Winner: "",
          Round: "semi"
        }
      })
    });

    board++;
    if(board > boardCount) board = 1;
  }

  await refreshMatches();
}
