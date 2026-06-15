let players = [];
let guests = [];

// ==========================
window.addEventListener("DOMContentLoaded", async () => {
  const ok = await ensureLogin();
  if (!ok) return;
  await loadPlayers();
});


// ==========================
// ✅ PLAYER STATS FIX
// ==========================
function getPlayerStatsFromList(){
  return { avg: 0, total180: 0, co: 0 };
}


// ==========================
// ✅Trainingmatch
// ==========================
async function createTrainingMatch(){

  const p1 = document.getElementById("tp1").value;
  const p2 = document.getElementById("tp2").value;
  const board = document.getElementById("tboard").value || "1";

  if(!p1 || !p2 || p1 === p2){
    alert("❌ Ungültige Auswahl");
    return;
  }

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
          Title: `${p1} vs ${p2}`,
          Player1: p1,
          Player2: p2,
          Score1: 501,
          Score2: 501,
          Legs1: 0,
          Legs2: 0,
          LegsToWin: 3,
          Turn:"p1",
          Status:"active",
          BoardId: board,
          Mode:"training"
        }
      })
    }
  );

  alert("✅ Trainingsspiel gestartet");
}


// ==========================
// ✅ Update Player
// ==========================
async function updatePlayerMode(id, newMode){

  const token = await getToken();

  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Players/items/${id}/fields`,
    {
      method:"PATCH",
      headers:{
        Authorization:`Bearer ${token}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        Mode: newMode
      })
    }
  );

  // neu laden
  await loadPlayers();
}
// ==========================
// ✅ Spieler hinzufügen
// ==========================
async function addPlayer(){

  const name = document.getElementById("playerInput").value.trim();
  const type = document.getElementById("playerType").value;

  if(!name) return;

  const token = await getToken();

  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Players/items`,
    {
      method:"POST",
      headers:{
        Authorization:`Bearer ${token}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        fields:{
          Title: name,
          Mode: type
        }
      })
    }
  );

  document.getElementById("playerInput").value="";
  await loadPlayers();
}

// ==========================
// ✅ SPIELER LADEN
// ==========================
async function loadPlayers(){

  players = await getList("Players");

  const trainingDiv = document.getElementById("trainingPlayers");
  const p1 = document.getElementById("tp1");
  const p2 = document.getElementById("tp2");

  trainingDiv.innerHTML = "";
  p1.innerHTML = "";
  p2.innerHTML = "";

  for(const p of players){

    const f = p.fields;
    const name = f.Title;
    const mode = f.Mode || "training";

    trainingDiv.innerHTML += `
      <div class="playerRow">
        <span>${name}</span>

        <select onchange="updatePlayerMode('${p.id}', this.value)">
          <option value="training" ${mode==="training"?"selected":""}>Training</option>
          <option value="both" ${mode==="both"?"selected":""}>Beides</option>
          <option value="tournament" ${mode==="tournament"?"selected":""}>Turnier</option>
        </select>
      </div>
    `;

    if(mode === "training" || mode === "both"){
      p1.innerHTML += `<option value="${name}">${name}</option>`;
      p2.innerHTML += `<option value="${name}">${name}</option>`;
    }
  }

  renderTournamentPlayers();
}


// ==========================
// ✅ TOURNAMENT PLAYER LIST
// ==========================
function renderTournamentPlayers(){

  const div = document.getElementById("tournamentPlayers");
  div.innerHTML = "";

  players.forEach(p => {
    const name = p.fields.Title;
    const mode = p.fields.Mode || "training";

    if(mode === "tournament" || mode === "both"){
      div.innerHTML += `
        <div>
          <label>
            <input type="checkbox" class="tPlayer" value="${name}" checked>
            ${name}
          </label>
        </div>
      `;
    }
  });

  guests.forEach(name => {
    div.innerHTML += `
      <div>
        <label>
          <input type="checkbox" class="tPlayer" value="${name}" checked>
          ${name} (Gast)
        </label>
      </div>
    `;
  });
}


// ==========================
// ✅ GAST HINZUFÜGEN
// ==========================
function addGuest(){
  const name = document.getElementById("guestInput").value.trim();
  if(!name) return;
  guests.push(name);
  renderTournamentPlayers();
}


// ==========================
// ✅ TURNIER START
// ==========================
async function startTournament(){

  const boardCount = parseInt(document.getElementById("boardCount").value) || 2;
  const useGroups = document.getElementById("useGroups").checked;

  localStorage.setItem("boardCount", boardCount);

  await clearMatches();

  let list = [...document.querySelectorAll(".tPlayer:checked")]
    .map(el => el.value);

  if(list.length < 4){
    alert("❌ Mindestens 4 Spieler für komplettes Turnier");
    return;
  }

  list = seedPlayers(fillWithByes(list));

  if(useGroups){

    await createGroups(list);

    // 🚫 KEIN KO HIER!!!
    alert("✅ Gruppenphase gestartet");

  } else {

    await createFullKO(list);

    await activateFirstMatches();

    alert("✅ KO Turnier gestartet");
  }
}

async function createFullKO(players){

  let size = players.length;

  const map = {
    64:"r64",
    32:"r32",
    16:"r16",
    8:"quarter",
    4:"semi",
    2:"final"
  };

  // erste Runde
  for(let i=0;i<players.length;i+=2){
    await createMatch(
      players[i],
      players[i+1],
      null,
      "",
      map[players.length],
      "waiting"
    );
  }

  // leere spätere Runden
  let next = players.length / 2;

  while(next >= 2){

    for(let i=0;i<next/2;i++){
      await createMatch("", "", null, "", map[next], "waiting");
    }

    next /= 2;
  }

  // Platz 3
  await createMatch("", "", null, "", "third", "waiting");
}


// ==========================
// ✅ GRUPPENPHASE
// ==========================
async function createGroups(players){

  let groupSize = parseInt(document.getElementById("groupSize")?.value) || 2;
  let group = "A";

  for(let i=0;i<players.length;i+=groupSize){

    let gPlayers = players.slice(i, i + groupSize);

    for(let x=0;x<gPlayers.length;x++){
      for(let y=x+1;y<gPlayers.length;y++){
        await createMatch(gPlayers[x], gPlayers[y], null, group, "group", "waiting");
      }
    }

    group = String.fromCharCode(group.charCodeAt(0)+1);
  }
}



// ==========================
// ✅ MATCH AKTIVIEREN
// ==========================
async function activateFirstMatches(){

  const token = await getToken();
  const matches = await getList("Matches");

  const boardCount = parseInt(localStorage.getItem("boardCount")) || 2;

  const first = matches
    .filter(m => m.fields.Status === "waiting")
    .slice(0, boardCount);

  for(let i = 0; i < first.length; i++){

    await fetch(
      `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${first[i].id}/fields`,
      {
        method:"PATCH",
        headers:{
          Authorization:`Bearer ${token}`,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          Status:"active",
          BoardId: String(i+1) // ✅ DAS FEHLTE!
        })
      }
    );
  }
}



// ==========================
// ✅ CLEAR MATCHES (FEHLTE)
// ==========================
async function clearMatches(){

  const token = await getToken();
  const matches = await getList("Matches");

  for(const m of matches){
    await fetch(
      `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${m.id}`,
      {
        method:"DELETE",
        headers:{ Authorization:`Bearer ${token}` }
      }
    );
  }
  alert("✅ Spiele beendet");
}


// ==========================
// ✅ TRAINING RESET FIX
// ==========================
async function endAllTrainingMatches(){

  const token = await getToken();
  const matches = await getList("Matches");

  const training = matches.filter(m =>
    m.fields && m.fields.Mode === "training"
  );

  for(const m of training){
    await fetch(
      `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${m.id}/fields`,
      {
        method:"PATCH",
        headers:{
          Authorization:`Bearer ${token}`,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          Status:"finished",
          BoardId:null
        })
      }
    );
  }
   alert("✅ Alle Trainingsspiele beendet");
}


// ==========================
// ✅ TURNIER BEENDEN
// ==========================
async function endTournament(){

  const token = await getToken();
  const matches = await getList("Matches");

  for(const m of matches){
    await fetch(
      `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${m.id}/fields`,
      {
        method:"PATCH",
        headers:{
          Authorization:`Bearer ${token}`,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          Status:"finished",
          BoardId:null
        })
      }
    );
  }
  alert("✅ Turnier beendet");
}

// ==========================
// ✅ Freilos Funktion
// ==========================
function fillWithByes(players){

  let size = 1;

  while(size < players.length){
    size *= 2;
  }

  // fehlende Plätze auffüllen
  while(players.length < size){
    players.push("BYE");
  }

  return players;
}




//Seeding Funktion
function seedPlayers(players){

  players = players.sort(()=>Math.random()-0.5);

  let result = [];

  while(players.length){
    result.push(players.shift());
    if(players.length){
      result.push(players.pop());
    }
  }

  return result;
}

// ==========================
// ✅ MATCH ERSTELLEN
// ==========================
async function createMatch(p1, p2, board=null, group="", round="group", status="waiting"){

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
          Title:`${p1} vs ${p2}`,
          Player1:p1 || "",
          Player2:p2 || "",
          Score1:501,
          Score2:501,
          Legs1:0,
          Legs2:0,
          LegsToWin:3,
          BoardId: board || null,
          Turn:"p1",
          Status:status,
          Group:group,
          Winner:"",
          Round:round,
          Mode:"tournament"
        }
      })
    }
  );
}


