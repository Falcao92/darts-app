let players = [];

window.addEventListener("DOMContentLoaded", async () => {
  const ok = await ensureLogin();
  if (!ok) return;

  await loadPlayers();
});


// ==========================
// SPIELER
// ==========================
async function loadPlayers(){

  players = await getList("Players");

  const div = document.getElementById("players");
  const p1 = document.getElementById("p1");
  const p2 = document.getElementById("p2");

  div.innerHTML = "";
  p1.innerHTML = "";
  p2.innerHTML = "";

  players.forEach(p => {

    const name = p.fields?.Title;
    if(!name) return;

    div.innerHTML += `
      <div class="player">
        ${name}
        <button onclick="deletePlayer('${p.id}')">❌</button>
      </div>
    `;

    p1.innerHTML += `<option>${name}</option>`;
    p2.innerHTML += `<option>${name}</option>`;
  });
}


// ==========================
// 🧹 ALTE MATCHES LÖSCHEN
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
// MATCH ERSTELLEN
// ==========================
async function createMatch(p1, p2, board, group = "", round = "group", status = "waiting"){

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
        Title: p1 + " vs " + p2,
        Player1: p1,
        Player2: p2,
        Score1: 501,
        Score2: 501,
        Legs1: 0,
        Legs2: 0,
        LegsToWin: 3,
        BoardId: board,
        Turn: "p1",
        Status: status,
        Group: group,
        Winner: "",
        Round: round
      }
    })
  });
}


// ==========================
// 🏆 GRUPPEN ERSTELLEN
// ==========================
async function createGroups(){

  const groupSize = parseInt(document.getElementById("groupSize").value);
  const boardCount = parseInt(document.getElementById("boardCount").value);

  // ✅ Alte Matches löschen (MEGA WICHTIG)
  await clearMatches();

  // ✅ Settings speichern
  localStorage.setItem("boardCount", boardCount);

  let list = players.map(p => p.fields.Title);
  list.sort(() => Math.random() - 0.5);

  let groups = [];

  for(let i=0;i<list.length;i+=groupSize){
    groups.push(list.slice(i, i+groupSize));
  }

  // ✅ Gruppen speichern für Overview
  localStorage.setItem("groups", JSON.stringify(groups));

  renderGroups(groups);

  let board = 1;

  for(let g=0; g<groups.length; g++){

    const groupId = String.fromCharCode(65 + g);
    const group = groups[g];

    let firstMatch = true;

    for(let a=0;a<group.length;a++){
      for(let b=a+1;b<group.length;b++){

        await createMatch(
          group[a],
          group[b],
          board,
          groupId,
          "group",
          firstMatch ? "active" : "waiting"
        );

        firstMatch = false;

        board++;
        if(board > boardCount) board = 1;
      }
    }
  }
}


// ==========================
// GRUPPEN ANZEIGEN
// ==========================
function renderGroups(groups){

  const div = document.getElementById("groupsView");

  let html = "<h3>Gruppen</h3>";

  groups.forEach((g, i) => {

    const groupId = String.fromCharCode(65 + i);

    html += `
      <div>
        <b>Gruppe ${groupId}</b><br>
        ${g.join("<br>")}
      </div><br>
    `;
  });

  div.innerHTML = html;
}


// ==========================
// 🏆 KO PHASE STARTEN
// ==========================
async function startKO(){

  const boardCount = parseInt(document.getElementById("boardCount").value);
  localStorage.setItem("boardCount", boardCount);

  const matches = await getList("Matches");

  let winners = matches
    .filter(m => m.fields.Round === "group" && m.fields.Winner)
    .map(m => m.fields.Winner);

  // ✅ eindeutige Spieler
  winners = [...new Set(winners)];

  createKORound(winners, boardCount);
}


// ==========================
// KO RUNDE
// ==========================
async function createKORound(players, boardCount){

  players.sort(() => Math.random() - 0.5);

  let board = 1;
  let firstMatch = true;

  let roundName = getRoundName(players.length);

  for(let i=0;i<players.length;i+=2){

    await createMatch(
      players[i],
      players[i+1],
      board,
      "",
      roundName,
      firstMatch ? "active" : "waiting"
    );

    firstMatch = false;

    board++;
    if(board > boardCount) board = 1;
  }
}


// ==========================
// RUNDE NAME
// ==========================
function getRoundName(count){

  if(count === 16) return "last16";
  if(count === 8) return "quarter";
  if(count === 4) return "semi";
  if(count === 2) return "final";

  return "ko";
}
