let players = [];
let guests = [];

window.addEventListener("DOMContentLoaded", async () => {

  const ok = await ensureLogin();
  if (!ok) return;

  await loadPlayers();
});


// ==========================
// ✅ SPIELER LADEN
// ==========================
async function loadPlayers(){

  players = await getList("Players");

  const trainingDiv = document.getElementById("trainingPlayers");
  const tournamentDiv = document.getElementById("tournamentPlayers");

  const p1 = document.getElementById("tp1");
  const p2 = document.getElementById("tp2");

  if(trainingDiv) trainingDiv.innerHTML="";
  if(tournamentDiv) tournamentDiv.innerHTML="";
  if(p1) p1.innerHTML="";
  if(p2) p2.innerHTML="";

for(const p of players){

    const f = p.fields;
    const name = f.Title;
    const mode = f.Mode || "training";

    // ✅ TRAININGSGRUPPE (ALLE SPIELER!)
    if(trainingDiv){
   const stats = await getPlayerStats(name);

trainingDiv.innerHTML += `
  <div class="playerRow">

    <span>
      ${name}
      <br>
      <small>
        Avg: ${stats.avg} |
        180: ${stats.total180} |
        CO: ${stats.co}%
      </small>
    </span>


          <select onchange="updatePlayerMode('${p.id}', this.value)">
            <option value="training" ${mode==="training"?"selected":""}>Training</option>
            <option value="both" ${mode==="both"?"selected":""}>Beides</option>
            <option value="tournament" ${mode==="tournament"?"selected":""}>Turnier</option>
          </select>

          <button onclick="deletePlayer('${p.id}')">❌</button>

        </div>
      `;
    }

    // ✅ TRAINING DROPDOWN (nur Training/Both)
    if(mode === "training" || mode === "both"){
      if(p1) p1.innerHTML += `<option value="${name}">${name}</option>`;
      if(p2) p2.innerHTML += `<option value="${name}">${name}</option>`;
    }
  });

  // ✅ Turnierliste separat aufbauen
  renderTournamentPlayers();
}


// ==========================
// ✅ MODE ÄNDERN
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

  await loadPlayers();
}


// ==========================
// ✅ TRAINING MATCH
// ==========================
async function createTrainingMatch(){

  const p1 = document.getElementById("tp1").value;
  const p2 = document.getElementById("tp2").value;
  const board = document.getElementById("tboard").value;

  if(!p1 || !p2 || p1 === p2){
    alert("❌ Ungültige Auswahl");
    return;
  }

  const token = await getToken();

  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/TrainingMatches/items`,
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
          Status: "active",
          BoardId: board
        }
      })
    }
  );

  alert("✅ Trainingsspiel gestartet");
}


// ==========================
// ✅ TURNIERLISTE (MIT GÄSTEN)
// ==========================
function renderTournamentPlayers(){

  const div = document.getElementById("tournamentPlayers");
  if(!div) return;

  div.innerHTML = "";

  // ✅ gespeicherte Spieler
  players.forEach(p => {

    const f = p.fields;
    const name = f.Title;
    const mode = f.Mode || "training";

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

  // ✅ Gäste (bleiben im Speicher)
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
// ✅ GAST SPIELER
// ==========================
function addGuest(){

  const name = document.getElementById("guestInput").value.trim();
  if(!name) return;

  guests.push(name);

  document.getElementById("guestInput").value="";

  renderTournamentPlayers();
}


// ==========================
// ✅ SPIELER ANLEGEN
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
async function deletePlayer(id){

  const token = await getToken();

  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Players/items/${id}`,
    {
      method:"DELETE",
      headers:{ Authorization:`Bearer ${token}` }
    }
  );

  await loadPlayers();
}


// ==========================
// ✅ TURNIER START
// ==========================
async function startTournament(){

  const boardCount = parseInt(document.getElementById("boardCount").value);
  const useGroups = document.getElementById("useGroups").checked;

  localStorage.setItem("boardCount", boardCount);

  await clearMatches();

  let list = [...document.querySelectorAll(".tPlayer:checked")]
    .map(el => el.value);

  if(list.length < 2){
    alert("❌ Zu wenig Spieler");
    return;
  }

  if(useGroups){
    await createGroups(list);
  } else {
    await createKOBracket(list, boardCount);
  }

  alert("✅ Turnier gestartet");
}


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
}

async function getPlayerStats(name){

  const matches = await getList("TrainingMatches");

  let games = 0;
  let wins = 0;
  let totalPoints = 0;
  let totalDarts = 0;
  let total180 = 0;
  let checkoutsMade = 0;
  let checkoutAttempts = 0;

  matches.forEach(m => {

    const f = m.fields;

    if(f.Player1 !== name && f.Player2 !== name) return;

    games++;

    if(f.Winner === name) wins++;

    // ✅ TODO simpel (kann später verfeinert werden)
    const score = (f.Player1 === name) ? f.Score1 : f.Score2;
    totalPoints += (501 - score);

    totalDarts += 30; // grob angenommen (3 darts * ~10 runden)

    // future ready
    if(f["180_1"] || f["180_2"]){
      total180 += (f.Player1 === name) ? (f["180_1"]||0) : (f["180_2"]||0);
    }

    if(f["Checkout1"] || f["Checkout2"]){
      if((f.Player1 === name && f["Checkout1"]) ||
         (f.Player2 === name && f["Checkout2"])){
        checkoutsMade++;
      }
      checkoutAttempts++;
    }
  });

  const avg = games > 0 ? (totalPoints / totalDarts * 3 * 100).toFixed(1) : 0;
  const co = checkoutAttempts > 0 ? ((checkoutsMade / checkoutAttempts)*100).toFixed(0) : 0;

  return {
    games,
    wins,
    avg,
    total180,
    co
  };
}
