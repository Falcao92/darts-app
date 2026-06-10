let players = [];

window.addEventListener("DOMContentLoaded", async () => {
  const ok = await ensureLogin();
  if (!ok) return;

  await loadPlayers();
});


// ==========================
// 🚀 TURNIER START
// ==========================
async function startTournament(){

  const useGroups = document.getElementById("useGroups").checked;
  const boardCount = parseInt(document.getElementById("boardCount").value);

  localStorage.setItem("boardCount", boardCount);

  await clearMatches();

  if(useGroups){

    await createGroups();

    alert("✅ Gruppenphase gestartet");

  } else {

    let list = players.map(p => p.fields.Title);

    // ✅ Fix ungerade Spieler
    if(list.length % 2 !== 0){
      list.pop();
      alert("⚠️ Ungerade Spieler – letzter entfernt");
    }

    await createKOBracket(list, boardCount);

    alert("✅ KO Turnier gestartet");
  }
}


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
async function deletePlayer(id){

  const token = await getToken();

  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Players/items/${id}`,
  {
    method:"DELETE",
    headers:{ Authorization:`Bearer ${token}` }
  });

  await loadPlayers();
}


// ==========================
// MATCHES LÖSCHEN
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
// MATCH CREATE
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
        Round: round,
        NextMatchId: "",
        NextSlot: ""
      }
    })
  });
}


// ==========================
// 🧩 GRUPPEN
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

  localStorage.setItem("groups", JSON.stringify(groups));

  renderGroups(groups);

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
function renderGroups(groups){

  const div = document.getElementById("groupsView");

  let html = "<h3>Gruppen</h3>";

  groups.forEach((g,i)=>{

    const name = String.fromCharCode(65+i);

    html += `<b>Gruppe ${name}</b><br>`;
    html += g.join("<br>");
    html += "<br><br>";
  });

  div.innerHTML = html;
}


// ==========================
// 🏆 KO
// ==========================
async function createKOBracket(players, boardCount){

  if(players.length < 2) return;

  if(players.length % 2 !== 0){
    players.pop();
  }

  players.sort(()=>Math.random()-0.5);

  let round = getRoundName(players.length);

  let first = [];

  for(let i=0;i<players.length;i+=2){

    first.push({
      Player1: players[i],
      Player2: players[i+1],
      Round: round
    });
  }

  if(first.length === 0) return;

  await createNextRounds(first, boardCount);
}


// ==========================
function getNextRound(r){

  if(r==="last16") return "quarter";
  if(r==="quarter") return "semi";
  if(r==="semi") return "final";

  return "final";
}


// ==========================
async function createNextRounds(firstRound, boardCount){

  if(!firstRound || firstRound.length === 0){
    console.error("❌ kein Start");
    return;
  }

  let current = firstRound;

  let next = getNextRound(current[0].Round);

  let board = 1;
  let ids = [];

  for(const m of current){

    const id = await createMatchReturnId(
      m.Player1,
      m.Player2,
      board,
      "",
      m.Round,
      "waiting"
    );

    ids.push(id);

    board++;
    if(board > boardCount) board = 1;
  }

  while(ids.length > 1){

    let nextIds = [];

    for(let i=0;i<ids.length;i+=2){

      const id = await createMatchReturnId(
        "",
        "",
        board,
        "",
        next,
        "waiting"
      );

      await linkMatch(ids[i], id, "p1");
      await linkMatch(ids[i+1], id, "p2");

      nextIds.push(id);

      board++;
      if(board > boardCount) board = 1;
    }

    ids = nextIds;
    next = getNextRound(next);
  }
}


// ==========================
async function createMatchReturnId(p1,p2,board,group,round,status){

  const token = await getToken();

  const res = await fetch(
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
        Group: "",
        Winner: "",
        Round: round,
        NextMatchId:"",
        NextSlot:""
      }
    })
  });

  const d = await res.json();
  return d.id;
}


// ==========================
async function linkMatch(fromId, toId, slot){

  const token = await getToken();

  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${fromId}/fields`,
  {
    method:"PATCH",
    headers:{
      Authorization:`Bearer ${token}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      NextMatchId: toId,
      NextSlot: slot
    })
  });
}


// ==========================
function getRoundName(count){

  if(count === 16) return "last16";
  if(count === 8) return "quarter";
  if(count === 4) return "semi";
  if(count === 2) return "final";

  return "ko";
}
