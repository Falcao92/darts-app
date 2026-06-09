let players = [];

window.addEventListener("DOMContentLoaded", async () => {

  const ok = await ensureLogin();
  if (!ok) return;

  await loadPlayers();
});


// ✅ Spieler laden
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

    // Anzeige
    div.innerHTML += `
      <div class="player">
        ${name}
        <button onclick="deletePlayer('${p.id}')">❌</button>
      </div>
    `;

    // Dropdown
    p1.innerHTML += `<option>${name}</option>`;
    p2.innerHTML += `<option>${name}</option>`;
  });
}


// ✅ Spieler erstellen
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


// ✅ Spieler löschen
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


// ✅ Trainingsspiel
async function createTraining(){

  const p1 = document.getElementById("p1").value;
  const p2 = document.getElementById("p2").value;

  await createMatch(p1, p2, randomBoard());
}


// ✅ KO Turnier
async function createKO(){

  const list = players.map(p => p.fields.Title);

  shuffle(list);

  for(let i=0;i<list.length;i+=2){

    await createMatch(
      list[i],
      list[i+1] || "Freilos",
      i/2 + 1
    );
  }
}


// ✅ Gruppenphase
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
}


// ✅ Match erstellen (zentral!)
async function createMatch(p1, p2, board){

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
        Turn: "p1"
      }
    })
  });
}


// ✅ Hilfsfunktionen

function shuffle(arr){
  return arr.sort(() => Math.random() - 0.5);
}

function randomBoard(){
  return Math.floor(Math.random() * 3) + 1;
}
