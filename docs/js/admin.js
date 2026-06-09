let players = [];

window.addEventListener("DOMContentLoaded", async () => {

  const ok = await ensureLogin();
  if (!ok) return;

  await loadPlayers();
  createBoards();
  await loadMatches();

});


// ✅ SPIELER LADEN
async function loadPlayers(){

  players = await getList("Players");

  const div = document.getElementById("players");
  const p1 = document.getElementById("p1");
  const p2 = document.getElementById("p2");

  div.innerHTML = "";
  p1.innerHTML = "";
  p2.innerHTML = "";

  players.forEach(p => {

    const name = p.fields.Title;

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


// ✅ SPIELER ERSTELLEN
async function createPlayer(){

  const name = document.getElementById("name").value;
  if (!name) return;

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
      fields:{ Title:name }
    })
  });

  document.getElementById("name").value = "";

  loadPlayers();
}


// ✅ SPIELER LÖSCHEN
async function deletePlayer(id){

  const token = await getToken();

  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Players/items/${id}`,
  {
    method:"DELETE",
    headers:{ Authorization:`Bearer ${token}` }
  });

  loadPlayers();
}


// ✅ BOARDS ERZEUGEN
function createBoards(){

  const sel = document.getElementById("board");
  sel.innerHTML = "";

  for(let i=1;i<=6;i++){
    sel.innerHTML += `<option value="${i}">Board ${i}</option>`;
  }
}


// ✅ TRAININGSSPIEL (JETZT MIT BOARD!)
async function createTraining(){

  const p1 = document.getElementById("p1").value;
  const p2 = document.getElementById("p2").value;
  const board = document.getElementById("board").value;

  if(p1 === p2){
    alert("Spieler müssen unterschiedlich sein!");
    return;
  }

  const matches = await getList("Matches");
  const exists = matches.find(m => m.fields.BoardId == board);

  if(exists){
    alert("Board ist bereits belegt!");
    return;
  }

  await createMatch(p1, p2, board);

  alert("✅ Match erstellt");

  await loadMatches();
}


// ✅ MATCHES ANZEIGEN
async function loadMatches(){

  const matches = await getList("Matches");
  const div = document.getElementById("activeMatches");

  div.innerHTML = "<h3>Aktuelle Spiele</h3>";

  matches.forEach(m => {

    const f = m.fields;

    div.innerHTML += `
      <div>
        Board ${f.BoardId}: ${f.Player1} vs ${f.Player2}
      </div>
    `;
  });
}


// ✅ KO TURNIER
async function createKO(){

  const list = players.map(p => p.fields.Title);
  shuffle(list);

  for(let i=0;i<list.length;i+=2){

    await createMatch(
      list[i],
      list[i+1] || "Freilos",
      Math.floor(i/2) + 1
    );
  }

  await loadMatches();
}


// ✅ GRUPPENPHASE
async function createGroups(){

  const list = players.map(p => p.fields.Title);
  shuffle(list);

  let board = 1;

  for(let i=0;i<list.length;i+=3){

    const group = list.slice(i, i+3);

    for(let a=0;a<group.length;a++){
      for(let b=a+1;b<group.length;b++){

        await createMatch(
          group[a],
          group[b],
          board++
        );
      }
    }
  }

  await loadMatches();
}


// ✅ MATCH ERSTELLEN
async function createMatch(p1, p2, board){

  const token = await getToken();

  console.log("Erstelle Match:", p1, p2, board);

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
        BoardId: parseInt(board),
        Turn: "p1"
      }
    })
  });

  if(!res.ok){
    console.error("❌ Fehler:", await res.text());
  } else {
    console.log("✅ Match erstellt");
  }
}


// ✅ HILFSFUNKTIONEN
function shuffle(arr){
  return arr.sort(() => Math.random() - 0.5);
}
