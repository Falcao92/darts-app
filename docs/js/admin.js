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

  console.log("Geladene Spieler:", players); // Debug

  const div = document.getElementById("players");
  const p1 = document.getElementById("p1");
  const p2 = document.getElementById("p2");

  div.innerHTML = "";
  p1.innerHTML = "";
  p2.innerHTML = "";

  players.forEach(p => {

    const name = p.fields?.Title;

    if(!name) return;

    // ✅ Anzeige Liste
    div.innerHTML += `
      <div class="player">
        ${name}
        <button onclick="deletePlayer('${p.id}')">❌</button>
      </div>
    `;

    // ✅ Dropdown
    p1.innerHTML += `<option>${name}</option>`;
    p2.innerHTML += `<option>${name}</option>`;
  });
}


// ==========================
// MATCH ERSTELLEN
// ==========================
async function createMatch(p1, p2, board, group = "", round = "group"){

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
        Status: "active",
        Group: group,
        Winner: "",
        Round: round
      }
    })
  });
}


// ==========================
// GRUPPEN ERSTELLEN
// ==========================
async function createGroups(){

  const groupSize = parseInt(document.getElementById("groupSize").value);
  const boardCount = parseInt(document.getElementById("boardCount").value);

  let list = players.map(p => p.fields.Title);

  list.sort(() => Math.random() - 0.5);

  let groups = [];

  for(let i=0;i<list.length;i+=groupSize){
    groups.push(list.slice(i, i+groupSize));
  }

  renderGroups(groups);

  let board = 1;

  for(let g=0; g<groups.length; g++){

    const groupId = String.fromCharCode(65 + g); // A, B, C...

    let group = groups[g];

    for(let a=0;a<group.length;a++){
      for(let b=a+1;b<group.length;b++){

        await createMatch(
          group[a],
          group[b],
          board,
          groupId,
          "group"
        );

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

    html += `<div><b>Gruppe ${groupId}</b><br>${g.join("<br>")}</div><br>`;
  });

  div.innerHTML = html;
}


// ==========================
// TABELLE BERECHNEN
// ==========================
async function calculateGroups(){

  const matches = await getList("Matches");

  const finished = matches.filter(m =>
    m.fields &&
    m.fields.Round === "group" &&
    m.fields.Winner
  );

  let table = {};

  finished.forEach(m => {

    const f = m.fields;

    if(!table[f.Group]) table[f.Group] = {};

    if(!table[f.Group][f.Player1]) table[f.Group][f.Player1] = 0;
    if(!table[f.Group][f.Player2]) table[f.Group][f.Player2] = 0;

    table[f.Group][f.Winner] += 2;
  });

  renderTable(table);

  return table;
}


// ==========================
// TABELLE ANZEIGEN
// ==========================
function renderTable(table){

  const div = document.getElementById("groupsView");

  let html = "<h3>Gruppentabelle</h3>";

  Object.keys(table).forEach(group => {

    let sorted = Object.entries(table[group])
      .sort((a,b)=>b[1]-a[1]);

    html += `<div><b>Gruppe ${group}</b><br>`;

    sorted.forEach(p => {
      html += `${p[0]} - ${p[1]} Punkte<br>`;
    });

    html += "</div><br>";
  });

  div.innerHTML = html;
}


// ==========================
// KO PHASE STARTEN
// ==========================
async function startKO(){

  const boardCount = parseInt(document.getElementById("boardCount").value);

  const table = await calculateGroups();

  let qualified = [];

  // 👉 Top 2 jeder Gruppe
  Object.values(table).forEach(group => {

    const sorted = Object.entries(group)
      .sort((a,b)=>b[1]-a[1]);

    qualified.push(sorted[0][0]);

    if(sorted[1]) qualified.push(sorted[1][0]);
  });

  createKORound(qualified, boardCount);
}


// ==========================
// KO RUNDE ERZEUGEN
// ==========================
async function createKORound(players, boardCount){

  players.sort(()=>Math.random()-0.5);

  let board = 1;

  let roundName = getRoundName(players.length);

  for(let i=0;i<players.length;i+=2){

    await createMatch(
      players[i],
      players[i+1],
      board,
      "",
      roundName
    );

    board++;

    if(board > boardCount) board = 1;
  }
}


// ==========================
// RUNDE BENENNEN
// ==========================
function getRoundName(count){

  if(count === 16) return "last16";
  if(count === 8) return "quarter";
  if(count === 4) return "semi";
  if(count === 2) return "final";

  return "ko";
}
