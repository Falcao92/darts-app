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

  list = smartShuffle(list);

if(useGroups){
  await createGroups(list);

  // ⚠ Nur initiale KO Slots erzeugen (leer)
  await createKO([]);
} else {
  await createKO(list);

  await activateFirstMatches();

  alert("✅ Turnier gestartet (inkl. Finale + Platz 3)");
}
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
// ✅ KO KOMPLETT (SEMI + FINAL + 3.PLATZ)
// ==========================
async function createKO(players){

  // nur erste 4 Spieler (klassisches Turnier)
  players = players.slice(0, 4);

  // Halbfinals
  await createMatch(players[0], players[1], null, "", "semi", "waiting");
  await createMatch(players[2], players[3], null, "", "semi", "waiting");

  // Finale
  await createMatch("", "", null, "", "final", "waiting");

  // Spiel um Platz 3
  await createMatch("", "", null, "", "third", "waiting");
}


  //////////////
//KO Generierung von Gruppen
  ///////////
async function generateKOFromGroups(){

  const matches = await getList("Matches");

  // 👉 nur Gruppenspiele
  const groupMatches = matches.filter(m =>
    m.fields && m.fields.Round === "group"
  );

  if(groupMatches.length === 0) return;

  // ✅ prüfen ob alle fertig
  const allFinished = groupMatches.every(m =>
    m.fields.Status === "finished"
  );

  if(!allFinished) return;

  // ==========================
  // ✅ GRUPPEN AUSWERTEN
  // ==========================
  let groups = {};

  groupMatches.forEach(m => {

    const f = m.fields;

    if(!groups[f.Group]){
      groups[f.Group] = {};
    }

    // Initialisierung
    if(!groups[f.Group][f.Player1]){
      groups[f.Group][f.Player1] = 0;
    }
    if(!groups[f.Group][f.Player2]){
      groups[f.Group][f.Player2] = 0;
    }

    // Punkte zählen
    if(f.Winner){
      groups[f.Group][f.Winner] += 2;
    }
  });

  // ==========================
  // ✅ TOP 2 JE GRUPPE
  // ==========================
  let qualified = [];

  Object.values(groups).forEach(group => {

    const sorted = Object.entries(group)
      .sort((a,b) => b[1] - a[1]);

    if(sorted[0]) qualified.push(sorted[0][0]);
    if(sorted[1]) qualified.push(sorted[1][0]);
  });

  console.log("✅ Qualifiziert für KO:", qualified);

  if(qualified.length < 4){
    console.warn("zu wenig Spieler für KO");
    return;
  }

  // ==========================
  // ✅ KO ERSTELLEN
  // ==========================
  await createKO(qualified);

  // direkt starten
  await activateFirstMatches();
}


  
//////////////
//KO System
  ///////////
  async function progressKO(){

  const matches = await getList("Matches");
  const token = await getToken();

  const semis = matches.filter(m => m.fields.Round === "semi");
  const finishedSemis = semis.filter(m => m.fields.Status === "finished");

  if(finishedSemis.length !== 2) return;

  const final = matches.find(m => m.fields.Round === "final");
  const third = matches.find(m => m.fields.Round === "third");

  if(!final || !third) return;

  const winners = [];
  const losers = [];

  finishedSemis.forEach(m => {
    const f = m.fields;

    winners.push(f.Winner);

    const loser = (f.Player1 === f.Winner)
      ? f.Player2
      : f.Player1;

    losers.push(loser);
  });

  // ✅ Finale setzen
  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${final.id}/fields`,
    {
      method:"PATCH",
      headers:{
        Authorization:`Bearer ${token}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        Player1: winners[0],
        Player2: winners[1]
      })
    }
  );

  // ✅ Platz 3 setzen
  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${third.id}/fields`,
    {
      method:"PATCH",
      headers:{
        Authorization:`Bearer ${token}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        Player1: losers[0],
        Player2: losers[1]
      })
    }
  );
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


// ==========================
// ✅ SMART SHUFFLE
// ==========================
function smartShuffle(list){

  list = [...list].sort(() => Math.random() - 0.5);

  const half = Math.ceil(list.length/2);
  const top = list.slice(0,half);
  const bottom = list.slice(half);

  let result = [];

  for(let i=0;i<half;i++){
    if(top[i]) result.push(top[i]);
    if(bottom[i]) result.push(bottom[i]);
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

