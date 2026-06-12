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
  const p1 = document.getElementById("tp1");
  const p2 = document.getElementById("tp2");

  trainingDiv.innerHTML="";
  p1.innerHTML="";
  p2.innerHTML="";

  // ✅ NUR NOCH Matches
  const allMatches = await getList("Matches");

  // 👉 nur Trainingsmatches filtern
  const trainingMatches = allMatches.filter(m =>
    m.fields && m.fields.Mode === "training"
  );

  for(const p of players){

    const f = p.fields;
    const name = f.Title;
    const mode = f.Mode || "training";

    const stats = getPlayerStatsFromList(name, trainingMatches);

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

    if(mode === "training" || mode === "both"){
      p1.innerHTML += `<option value="${name}">${name}</option>`;
      p2.innerHTML += `<option value="${name}">${name}</option>`;
    }
  }

  renderTournamentPlayers();
}


// ==========================
// ✅ STATS
// ==========================
function getPlayerStatsFromList(name, matches){

  let totalPoints = 0;
  let totalDarts = 0;
  let total180 = 0;
  let checkoutsMade = 0;
  let checkoutAttempts = 0;

  matches.forEach(m => {

    const f = m.fields;

    if(f.Player1 !== name && f.Player2 !== name) return;

    const score = (f.Player1 === name) ? f.Score1 : f.Score2;
    totalPoints += (501 - (score || 501));
    totalDarts += 30;

    total180 += (f.Player1 === name)
      ? (f["180_1"] || 0)
      : (f["180_2"] || 0);

    if(f["Checkout1"] || f["Checkout2"]){
      if((f.Player1 === name && f["Checkout1"]) ||
         (f.Player2 === name && f["Checkout2"])){
        checkoutsMade++;
      }
      checkoutAttempts++;
    }
  });

  const avg = totalDarts > 0 ? (totalPoints / totalDarts * 300).toFixed(1) : 0;
  const co = checkoutAttempts > 0 ? ((checkoutsMade / checkoutAttempts)*100).toFixed(0) : 0;

  return { avg, total180, co };
}


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
      body:JSON.stringify({ Mode: newMode })
    }
  );

  await loadPlayers();
}


// ==========================
// ✅ TURNIER SPIELERAUSWAHL
// ==========================
function renderTournamentPlayers(){

  const div = document.getElementById("tournamentPlayers");

  div.innerHTML = "";

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
function addGuest(){

  const name = document.getElementById("guestInput").value.trim();
  if(!name) return;

  guests.push(name);
  document.getElementById("guestInput").value="";

  renderTournamentPlayers();
}


// ==========================
// ✅ TRAINING MATCH (NEU!)
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
          Turn: "p1",
          Status: "active",
          BoardId: String(board),
          Mode: "training"   // ✅ entscheidend
        }
      })
    }
  );

  alert("✅ Trainingsspiel gestartet");
}


// ==========================
// ✅ TURNIER START
// ==========================
async function startTournament(){

  // ✅ Boards direkt aus Input holen
  const boardCount = parseInt(document.getElementById("boardCount").value) || 2;

  const useGroups = document.getElementById("useGroups").checked;

  // ✅ für Input / Overview speichern
  localStorage.setItem("boardCount", boardCount);

  // ✅ alte Matches löschen
  await clearMatches();

  // ✅ Spielerliste holen
  let list = [...document.querySelectorAll(".tPlayer:checked")]
    .map(el => el.value);

  if(list.length < 2){
    alert("❌ Zu wenig Spieler");
    return;
  }

  // ✅ Turnier erstellen
  if(useGroups){
    await createGroups(list);
  } else {
    await createKOBracket(list);
  }

  // ✅ direkt erste Matches aktivieren (wichtig!)
  await activateFirstMatches();

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

// ==========================
// ✅ Turnier beenden
// ==========================
async function endTournament(){

  const confirmEnd = confirm("Turnier wirklich beenden?");
  if(!confirmEnd) return;

  const token = await getToken();
  const matches = await getList("Matches");

  const tournamentMatches = matches.filter(m =>
    m.fields && m.fields.Mode === "tournament"
  );

  for(const m of tournamentMatches){

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
// ✅ MATCH ERSTELLEN (NEU)
// ==========================
async function createMatch(p1, p2, board="", group="", round="group", status="waiting"){

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
          BoardId: null,
          Turn: "p1",
          Status: status,
          Group: group,
          Winner: "",
          Round: round,
          Mode: "tournament"   // ✅ NEU
        }
      })
    }
  );
}
