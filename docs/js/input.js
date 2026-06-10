let matches = [];
let currentMatch = null;
let currentInput = 1;

window.addEventListener("DOMContentLoaded", async () => {

  const ok = await ensureLogin();
  if (!ok) return;

  await refreshMatches();

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
    set("score", "-");
    set("turn", "-");
    set("legs", "-");
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
// SUBMIT (FIXED)
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


  // PLAYER 1
  if(turn === "p1"){

    let ns = score1 - total;

    if(ns < 0 || ns === 1){
      turn = "p2";
    }

    else if(ns === 0 && isDouble(lastDart)){

      legs1++;

      if(Number(legs1) >= legsToWin){
        await updateMatch(id, 501, 501, "p2", legs1, legs2, f.Player1);
      } else {
        await updateMatch(id, 501, 501, "p2", legs1, legs2);
      }

      resetInputs();
      await reloadMatch(id);
      return;
    }

    else{
      score1 = ns;
      turn = "p2";
    }
  }

  // PLAYER 2
  else{

    let ns = score2 - total;

    if(ns < 0 || ns === 1){
      turn = "p1";
    }

    else if(ns === 0 && isDouble(lastDart)){

      legs2++;

      if(Number(legs2) >= legsToWin){
        await updateMatch(id, 501, 501, "p1", legs1, legs2, f.Player2);
      } else {
        await updateMatch(id, 501, 501, "p1", legs1, legs2);
      }

      resetInputs();
      await reloadMatch(id);
      return;
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
    }
  );

  if(winner){
    await refreshMatches();
    await checkAndStartKO();
  }
}


// ==========================
// KO AUTO
// ==========================
async function checkAndStartKO(){

  const groupMatches = matches.filter(m =>
    m.fields.Round === "group"
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
// ✅ KO BUILDER (NEU)
// ==========================
async function createKOBracket(players, boardCount){

  players.sort(()=>Math.random()-0.5);

  let round = getRoundName(players.length);

  let board = 1;

  for(let i=0;i<players.length;i+=2){

    const token = await getToken();

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
          Group: "",
          Winner: "",
          Round: round
        }
      })
    });

    board++;
    if(board > boardCount) board = 1;
  }

  await refreshMatches();
}


// ==========================
function getRoundName(count){

  if(count === 16) return "last16";
  if(count === 8) return "quarter";
  if(count === 4) return "semi";
  if(count === 2) return "final";

  return "ko";
}


// ==========================
async function reloadMatch(id){
  await refreshMatches();
  currentMatch = matches.find(m => m.id === id);
  updateUI();
}

async function refreshMatches(){
  matches = await getList("Matches");
}

function resetInputs(){
  d1.value = "";
  d2.value = "";
  d3.value = "";
  currentInput = 1;
}
