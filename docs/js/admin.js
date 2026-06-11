let players = [];

window.addEventListener("DOMContentLoaded", async () => {

  const ok = await ensureLogin();
  if (!ok) return;

  await loadPlayers();

  // ✅ ENTER zum hinzufügen
  const input = document.getElementById("playerInput");
  if(input){
    input.addEventListener("keypress", e => {
      if(e.key === "Enter") addPlayer();
    });
  }
});


// ==========================
// ✅ SPIELER LADEN (KERN)
// ==========================
async function loadPlayers(){

  players = await getList("Players");

  const list = document.getElementById("playerList");
  const p1 = document.getElementById("tp1");
  const p2 = document.getElementById("tp2");

  if(!list) return;

  list.innerHTML = "";
  if(p1) p1.innerHTML = "";
  if(p2) p2.innerHTML = "";

  players.forEach(p => {

    const f = p.fields;
    const name = f.Title;
    const mode = f.Mode || "tournament";

    // ✅ Anzeige im Admin
    const div = document.createElement("div");
    div.innerHTML = `
      ${name} (${mode})
      <button onclick="deletePlayer('${p.id}')">❌</button>
    `;
    list.appendChild(div);

    // ✅ Training Spieler hinzufügen
    if(mode === "training" || mode === "both"){
      if(p1) p1.innerHTML += `<option value="${name}">${name}</option>`;
      if(p2) p2.innerHTML += `<option value="${name}">${name}</option>`;
    }
  });
}


// ==========================
// ✅ SPIELER HINZUFÜGEN
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
// ✅ SPIELER LÖSCHEN
// ==========================
async function deletePlayer(id){

  const token = await getToken();

  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Players/items/${id}`,
    {
      method:"DELETE",
      headers:{
        Authorization:`Bearer ${token}`
      }
    }
  );

  await loadPlayers();
}


// ==========================
// ✅ TRAINING START
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
          BoardId: board,
          Date: new Date().toISOString()
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

  const useGroups = document.getElementById("useGroups").checked;
  const boardCount = parseInt(document.getElementById("boardCount").value);

  localStorage.setItem("boardCount", boardCount);

  await clearMatches();

  // ✅ NUR TURNIERSPIELER VERWENDEN
  let list = players
    .filter(p => {
      const m = p.fields.Mode;
      return m === "tournament" || m === "both";
    })
    .map(p => p.fields.Title);

  if(list.length < 2){
    alert("❌ Mindestens 2 Turnierspieler nötig");
    return;
  }

  if(useGroups){

    await createGroups(list);

    alert("✅ Gruppenphase gestartet");

  } else {

    if(list.length % 2 !== 0){
      list.pop();
      alert("⚠️ Ungerade Spieler – letzter entfernt");
    }

    await createKOBracket(list, boardCount);

    alert("✅ KO Turnier gestartet");
  }
}


// ==========================
// ✅ MATCHES LÖSCHEN
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
// ✅ GRUPPEN ERZEUGEN
// ==========================
async function createGroups(list){

  const groupSize = parseInt(document.getElementById("groupSize").value);
  const boardCount = parseInt(document.getElementById("boardCount").value);

  list.sort(() => Math.random() - 0.5);

  let groups = [];

  for(let i=0;i<list.length;i+=groupSize){
    groups.push(list.slice(i, i+groupSize));
  }

  let board = 1;

  for(let g=0; g<groups.length; g++){

    const groupId = String.fromCharCode(65 + g);
    const group = groups[g];

    let first = true;

    for(let a=0;a<group.length;a++){
      for(let b=a+1;b<group.length;b++){

        await createMatch(
          group[a],
          group[b],
          board,
          groupId,
          "group",
          first ? "active" : "waiting"
        );

        first = false;

        board++;
        if(board > boardCount) board = 1;
      }
    }
  }
}


// ==========================
// ✅ MATCH ERSTELLEN
// ==========================
async function createMatch(p1, p2, board, group="", round="group", status="waiting"){

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
          BoardId: String(board),
          Turn: "p1",
          Status: status,
          Group: group,
          Winner: "",
          Round: round
        }
      })
    }
  );
}
