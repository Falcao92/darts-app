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

  const allMatches = await getList("Matches");

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
          ${name}<br>
          <small>Avg: ${stats.avg} | 180: ${stats.total180} | CO: ${stats.co}%</small>
        </span>

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
// ✅ TURNIER START
// ==========================
async function startTournament(){

  const boardCount = parseInt(document.getElementById("boardCount").value) || 2;
  const useGroups = document.getElementById("useGroups").checked;

  localStorage.setItem("boardCount", boardCount);

  await clearMatches();

  let list = [...document.querySelectorAll(".tPlayer:checked")]
    .map(el => el.value);

  if(list.length < 2){
    alert("❌ Zu wenig Spieler");
    return;
  }

  list = smartShuffle(list);

  if(useGroups){
    await createGroups(list);
  } else {
    await createKOBracket(list);
  }

  await activateFirstMatches();

  alert("✅ Turnier gestartet");
}


// ==========================
// ✅ KO BRACKET (NEU!)
// ==========================
async function createKOBracket(players){

  for(let i=0;i<players.length;i+=2){

    if(players[i+1]){
      await createMatch(players[i], players[i+1], null, "", "quarter", "waiting");
    }
  }
}


// ==========================
// ✅ GRUPPEN (simple)
// ==========================
async function createGroups(players){

  let g = 1;
  for(let i=0;i<players.length;i+=2){

    if(players[i+1]){
      await createMatch(players[i], players[i+1], null, "A", "group", "waiting");
    }
  }
}


// ==========================
// ✅ MATCH AKTIVIEREN
// ==========================
async function activateFirstMatches(){

  const matches = await getList("Matches");
  const token = await getToken();
  const boardCount = parseInt(localStorage.getItem("boardCount")) || 2;

  const waiting = matches.filter(m => m.fields.Status === "waiting");

  for(let i=0;i<Math.min(waiting.length, boardCount); i++){

    await fetch(
      `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${waiting[i].id}/fields`,
      {
        method:"PATCH",
        headers:{
          Authorization:`Bearer ${token}`,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          Status:"active",
          BoardId: String(i+1)
        })
      }
    );
  }
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

  await fetch(`https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items`,{
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
        BoardId:String(board),
        Mode:"training"
      }
    })
  });

  alert("✅ Trainingsspiel gestartet");
}


// ==========================
// ✅ TRAINING RESET
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

  alert("✅ Trainingsmatches beendet");
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
          Player1:p1,
          Player2:p2,
          Score1:501,
          Score2:501,
          Legs1:0,
          Legs2:0,
          LegsToWin:3,
          BoardId:board,
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
