let matches = [];
let currentMatch = null;
let mode = "tournament";

window.addEventListener("DOMContentLoaded", init);


async function init(){

  const ok = await ensureLogin();
  if (!ok) return;

  const modeSelect = document.getElementById("modeSelect");
  if(modeSelect){
    modeSelect.onchange = async (e)=>{
      mode = e.target.value;

      await refreshMatches();

      if(typeof fillBoards === "function"){
        await fillBoards();
      }

      await refreshMatches();

      buildBoardSelect();
      loadMatch();
    };
  }

  await refreshMatches();

  if(typeof fillBoards === "function"){
    await fillBoards();
  }

  await refreshMatches();

  buildBoardSelect();
  createButtons();
  loadMatch();
}


// ==========================
function getListName(){
  return mode === "training" ? "TrainingMatches" : "Matches";
}

// ==========================
// ✅ BOARD VERWALTUNG (KERNELEMENT)
// ==========================
async function fillBoards(){

  const boardCount = parseInt(localStorage.getItem("boardCount")) || 2;

  const active = matches.filter(m => m.fields.Status === "active");
  const waiting = matches.filter(m => m.fields.Status === "waiting");

  if(waiting.length === 0) return;

  let usedBoards = active
    .map(m => m.fields.BoardId)
    .filter(b => b !== null && b !== undefined && b !== "");

  let freeBoards = [];

  for(let i=1; i<=boardCount; i++){
    if(!usedBoards.includes(String(i))){
      freeBoards.push(String(i));
    }
  }

  if(freeBoards.length === 0) return;

  const token = await getToken();

  for(let i=0; i<freeBoards.length; i++){

    if(!waiting[i]) break;

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
          BoardId: freeBoards[i]
        })
      }
    );
  }
}


// ==========================
async function refreshMatches(){

  const all = await getList("Matches");

  matches = all.filter(m => {

    if(!m.fields) return false;

    const modeField = m.fields.Mode;
    const round = m.fields.Round;

    // ✅ TRAINING
    if(mode === "training"){
      return modeField === "training";
    }

    // ✅ TURNIER (ROBUST)
    if(mode === "tournament"){

      // explizit Turnier
      if(modeField === "tournament") return true;

      // fallback: alles mit Round = Turnier
      if(round) return true;

      return false;
    }

    return false;
  });

  console.log("FILTERED MATCHES:", matches);
}


// ==========================
// ✅ BOARDS FIXED
// ==========================
function buildBoardSelect(){

  const sel = document.getElementById("boardSelect");
  if(!sel) return;

  sel.innerHTML = "";

  // ✅ ALLE Boards aus Matches holen
  const boards = [...new Set(
    matches
      .map(m => m.fields?.BoardId)
      .filter(b => b !== null && b !== "" && b !== undefined)
  )];

  // ✅ sortieren
  boards.sort((a,b) => Number(a) - Number(b));

  // ✅ als Dropdown einbauen
  boards.forEach(b => {
    sel.innerHTML += `<option value="${b}">Board ${b}</option>`;
  });

  // fallback (wenn nichts da)

if(boards.length === 0){

  // ✅ NEU: Boards aus config erzeugen
  const count = parseInt(localStorage.getItem("boardCount")) || 2;

  for(let i=1; i<=count; i++){
    sel.innerHTML += `<option value="${i}">Board ${i}</option>`;
  }


  sel.onchange = loadMatch;
}


// ==========================
function loadMatch(){

  const sel = document.getElementById("boardSelect");
  if(!sel) return;

  const board = sel.value;

  currentMatch = matches.find(m =>
    m.fields &&
    m.fields.BoardId == board &&
    m.fields.Status === "active"
  );

 if(!currentMatch){

  const p1 = document.getElementById("p1");
  const p2 = document.getElementById("p2");

  if(p1 && p2){
    p1.innerText = "Kein Spiel";
    p2.innerText = "";
  }

  set("score","-");
  set("legs","-");
  set("turn","-");

  return;
}

console.log("Aktuelle Matches:", matches);
console.log("Board:", board);

  updateUI();
}


// ==========================
// ✅ UI UPDATE (FIXED + LIVE STATS)
// ==========================
function updateUI(){

  if(!currentMatch || !currentMatch.fields) return;

  const f = currentMatch.fields;

  const p1 = document.getElementById("p1");
  const p2 = document.getElementById("p2");

  if(p1 && p2){
    p1.innerText = f.Player1 || "";
    p2.innerText = f.Player2 || "";

    p1.className = "";
    p2.className = "";

    if(f.Turn === "p1"){
      p1.classList.add("activePlayer");
      p2.classList.add("inactivePlayer");
    }else{
      p2.classList.add("activePlayer");
      p1.classList.add("inactivePlayer");
    }
  }

  const s1 = f.Score1 ?? 501;
  const s2 = f.Score2 ?? 501;

  set("score", `${s1} : ${s2}`);
  set("legs", `Legs ${f.Legs1||0}:${f.Legs2||0}`);
  set("turn", f.Turn==="p1" ? f.Player1 : f.Player2);

  const darts = f.DartsThrown || 0;
  const scored = (501 - s1) + (501 - s2);
  const avg = darts > 0 ? ((scored / darts) * 3).toFixed(1) : 0;

  set("liveAvg", `Avg: ${avg} | Darts: ${darts}`);
}



// ==========================
function set(id,val){
  const el=document.getElementById(id);
  if(el) el.innerHTML=val;
}


// ==========================
// BUTTONS
// ==========================
function createButtons(){

  const div = document.getElementById("buttons");
  if(!div) return;

  div.innerHTML="";

  for(let i=1;i<=20;i++){
    addBtn(i);
    addBtn("D"+i);
    addBtn("T"+i);
  }

  addBtn("25");
  addBtn("BULL");
  addBtn("461");
}

function addBtn(v){

  const b=document.createElement("button");
  b.innerText=v;
  b.onclick=()=>insert(v);

  document.getElementById("buttons").appendChild(b);
}


// ==========================
function insert(v){

  const i1 = document.getElementById("d1");
  const i2 = document.getElementById("d2");
  const i3 = document.getElementById("d3");

  if(!i1.value) i1.value=v;
  else if(!i2.value) i2.value=v;
  else i3.value=v;
}


// ==========================
function val(v){
  if(!v) return 0;

  v=v.toUpperCase();

  if(v==="BULL") return 50;
  if(v==="25") return 25;

  if(v.startsWith("T")) return 3*parseInt(v.slice(1));
  if(v.startsWith("D")) return 2*parseInt(v.slice(1));

  return parseInt(v)||0;
}

function isDouble(v){
  return v && v.startsWith("D");
}


////KO Logik
async function progressKO(){

  await refreshMatches();

  const semis = matches.filter(m => m.fields.Round === "semi");
  const finished = semis.filter(m => m.fields.Status === "finished");

  if(finished.length !== 2) return;

  const finalExists = matches.some(m => m.fields.Round === "final");
  if(finalExists) return;

  let winners = [];
  let losers = [];

  finished.forEach(m => {

    const f = m.fields;
    winners.push(f.Winner);

    const loser = f.Player1 === f.Winner
      ? f.Player2
      : f.Player1;

    losers.push(loser);
  });

  await create(winners[0], winners[1], "final");
  await create(losers[0], losers[1], "third");

  await fillBoards();
}

// ==========================
async function submit(){

  if(!currentMatch) return;

  const f=currentMatch.fields;

  // ✅ FIX: nur einmal
  let darts = f.DartsThrown || 0;
  darts += 3;

  let s1=f.Score1;
  let s2=f.Score2;

  let l1=f.Legs1||0;
  let l2=f.Legs2||0;

  let turn=f.Turn;

  const total = val(d1.value)+val(d2.value)+val(d3.value);
  const last = d3.value||d2.value||d1.value;
  const target = parseInt(f.LegsToWin)||3;


  if(turn==="p1"){

    let ns=s1-total;

    if(ns===0 && isDouble(last)){
      l1++;
      if(l1>=target){
        await finishMatch(f.Player1,l1,l2);
        return;
      }
      await update(501,501,"p2",l1,l2,darts);
    } else {
      if(ns>1) s1=ns;
      turn="p2";
      await update(s1,s2,turn,l1,l2,darts);
    }

  }else{

    let ns=s2-total;

    if(ns===0 && isDouble(last)){
      l2++;
      if(l2>=target){
        await finishMatch(f.Player2,l1,l2);
        return;
      }
      await update(501,501,"p1",l1,l2,darts);
    } else {
      if(ns>1) s2=ns;
      turn="p1";
      await update(s1,s2,turn,l1,l2,darts);
    }
  }

  reset();
  await reload();
}


// ==========================
// ✅ UPDATE
// ==========================
async function update(s1,s2,turn,l1,l2,darts){

  const token=await getToken();

  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${currentMatch.id}/fields`,
    {
      method:"PATCH",
      headers:{
        Authorization:`Bearer ${token}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        Score1:s1,
        Score2:s2,
        Turn:turn,
        Legs1:l1,
        Legs2:l2,
        DartsThrown: darts   // ✅ FIX
      })
    }
  );
}



// ==========================
// ✅ MATCH ENDE → BOARD FREIGEBEN
// ==========================
async function finishMatch(winner,l1,l2){

  const token=await getToken();

  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${currentMatch.id}/fields`,
    {
      method:"PATCH",
      headers:{
        Authorization:`Bearer ${token}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        Legs1:l1,
        Legs2:l2,
        Winner:winner,
        Status:"finished",
        BoardId:null
      })
    }
  );

  await refreshMatches();

  if(mode === "tournament"){

    // ✅ NEU
    await autoProgress();    // Gruppen → KO
    await progressKO();      // Halbfinal → Finale

    await refreshMatches();
  }

  await fillBoards();
  await reload();
}



// ==========================
async function reload(){

  const sel = document.getElementById("boardSelect");
  const current = sel ? sel.value : null;

  await refreshMatches();
  buildBoardSelect();

  if(sel && current && [...sel.options].some(o => o.value === current)){
    sel.value = current; // ✅ Auswahl behalten
  }

  loadMatch();
}


function reset(){
  d1.value="";
  d2.value="";
  d3.value="";
}


//auto Fortsetzung
async function autoProgress(){

  await refreshMatches();

  const group = matches.filter(m =>
    m.fields && m.fields.Round === "group"
  );

  if(group.length === 0) return;

  const allFinished = group.every(m =>
    m.fields.Status === "finished"
  );

  console.log("GROUP STATUS:", group.map(g => g.fields.Status));

  if(allFinished){
    console.log("🔥 Gruppen fertig → starte KO");
    await startKO();
    await fillBoards();
  }
}

//KO_phase starten

async function startKO(){

  await refreshMatches();

  const exists = matches.some(m => m.fields.Round === "semi");
  if(exists){
    console.log("KO existiert bereits");
    return;
  }

  let groups = {};

  matches
    .filter(m => m.fields.Round === "group")
    .forEach(m => {

      const f = m.fields;

      if(!groups[f.Group]) groups[f.Group] = {};

      if(!groups[f.Group][f.Player1]) groups[f.Group][f.Player1] = 0;
      if(!groups[f.Group][f.Player2]) groups[f.Group][f.Player2] = 0;

      if(f.Winner){
        groups[f.Group][f.Winner] += 2;
      }
    });

  let players = [];

  Object.values(groups).forEach(g => {

    const sorted = Object.entries(g)
      .sort((a,b) => b[1] - a[1]);

    players.push(sorted[0][0]);
    if(sorted[1]) players.push(sorted[1][0]);
  });

  console.log("KO Spieler:", players);

  if(players.length < 4){
    console.log("⛔ zu wenig Spieler für KO");
    return;
  }

  // ✅ Halbfinale erstellen (WAR schon korrekt)
  await create(players[0], players[1], "semi", 1);
  await create(players[2], players[3], "semi", 2);

  console.log("✅ KO erstellt");

  // 🔥 DAS WAR DEIN FEHLENDER SCHRITT
  await fillBoards();   // ✅ aktiviert beide Spiele
}

async function create(p1,p2,round,board=null,token=null){

  if(!token) token = await getToken();

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
          BoardId:null,
          Turn:"p1",
          Status:"waiting",
          Round:round,
          Mode:"tournament"   // ✅ WICHTIG
        }
      })
    }
  );
}

//Reset Match
async function resetMatch(){

  if(!currentMatch){
    alert("Kein Spiel geladen");
    return;
  }

  const confirmReset = confirm("Match wirklich zurücksetzen?");
  if(!confirmReset) return;

  const token = await getToken();

  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${currentMatch.id}/fields`,
    {
      method:"PATCH",
      headers:{
        Authorization:`Bearer ${token}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        Score1: 501,
        Score2: 501,
        Legs1: 0,
        Legs2: 0,
        Turn: "p1"
      })
    }
  );

  await reload();
}


//Match beenden mit Gewinner
async function endMatchWithWinner(player){

  if(!currentMatch){
    alert("Kein Spiel geladen");
    return;
  }

  const confirmEnd = confirm("Match beenden und Sieger setzen?");
  if(!confirmEnd) return;

  const f = currentMatch.fields;

  let winner = player === "p1" ? f.Player1 : f.Player2;

  let l1 = f.Legs1 || 0;
  let l2 = f.Legs2 || 0;

  // ✅ optional: Sieger bekommt letzten Leg
  if(player === "p1") l1++;
  else l2++;

  const token = await getToken();

  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${currentMatch.id}/fields`,
    {
      method:"PATCH",
      headers:{
        Authorization:`Bearer ${token}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        Legs1: l1,
        Legs2: l2,
        Winner: winner,
        Status: "finished",
        BoardId: null
      })
    }
  );

  await reload();
}


//Halbfinale
async function handleSemiFinals(){

  await refreshMatches();

  const semis = matches.filter(m => m.fields.Round === "semi");
  const finished = semis.filter(m => m.fields.Status === "finished");

  // ✅ erst wenn beide fertig
  if(finished.length !== 2) return;

  // ✅ doppelte Erstellung verhindern
  const existingFinal = matches.some(m => m.fields.Round === "final");
  if(existingFinal) return;

  let winners = [];
  let losers = [];

  finished.forEach(m => {

    const f = m.fields;

    winners.push(f.Winner);

    const loser = (f.Player1 === f.Winner)
      ? f.Player2
      : f.Player1;

    losers.push(loser);
  });

  console.log("Finale Spieler:", winners);
  console.log("Spiel um Platz 3:", losers);

  // ✅ Finale
  await create(winners[0], winners[1], "final");

  // ✅ Platz 3
  await create(losers[0], losers[1], "third");

  // ✅ GANZ WICHTIG → Boards füllen
  await fillBoards();
}

async function endMatch(){

  if(!currentMatch){
    alert("Kein Spiel geladen");
    return;
  }

  const confirmEnd = confirm("Match wirklich beenden?");
  if(!confirmEnd) return;

  const token = await getToken();

  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${currentMatch.id}/fields`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        Status: "finished",
        BoardId: null
      })
    }
  );

    // ✅ neu laden
  await reload();
}
}


