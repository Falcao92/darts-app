let matches = [];
let currentMatch = null;
let mode = "tournament";

window.addEventListener("DOMContentLoaded", init);

// ==========================
async function init(){

  const ok = await ensureLogin();
  if (!ok) return;

  const sel = document.getElementById("modeSelect");

  if(sel){
    sel.onchange = async (e)=>{
      mode = e.target.value;

      await refreshMatches();
      await fillBoards();
      await refreshMatches();

      buildBoardSelect();
      loadMatch();
    };
  }

  await refreshMatches();
  await fillBoards();
  await refreshMatches();

  buildBoardSelect();
  createButtons();
  loadMatch();

  // ✅ LIVE AUTO REFRESH (NEU)
  setInterval(async ()=>{
    await refreshMatches();
    loadMatch();
  },2000);
}

// ==========================
async function refreshMatches(){

  const all = await getList("Matches");
  const activeTournament = localStorage.getItem("TournamentID");

  matches = all.filter(m => {

    if(!m.fields) return false;

    if(mode === "training"){
      return m.fields.Mode === "training";
    }

    if(mode === "tournament"){

      if(m.fields.Mode !== "tournament") return false;

      if(m.fields.Status === "archived") return false;

      // ✅ nur aktuelles Turnier
      if(activeTournament){
        return String(m.fields.TournamentID) === String(activeTournament);
      }

      return false; // ✅ NICHT alle zurückgeben!
    }

    return false;
  }); // ✅ DAS WAR DER FEHLER!
}

// ==========================
async function fillBoards(){

  await refreshMatches();

  const boardCount = parseInt(localStorage.getItem("boardCount")) || 2;

  const active = matches.filter(m => m.fields.Status === "active");
  const waiting = matches.filter(m => m.fields.Status === "waiting");

  let usedBoards = active
    .map(m => m.fields.BoardId)
    .filter(b => b);

  let freeBoards = [];

  for(let i=1; i<=boardCount; i++){
    if(!usedBoards.includes(String(i))){
      freeBoards.push(String(i));
    }
  }

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

  await refreshMatches();
}

// ==========================
function buildBoardSelect(){

  const sel = document.getElementById("boardSelect");
  if(!sel) return;

  sel.innerHTML="";

  const boards = [...new Set(
    matches.map(m=>m.fields?.BoardId).filter(Boolean)
  )];

  if(boards.length === 0){
    for(let i=1;i<=2;i++){
      sel.innerHTML += `<option value="${i}">Board ${i}</option>`;
    }
  }else{
    boards.sort((a,b)=>Number(a)-Number(b));
    boards.forEach(b=>{
      sel.innerHTML += `<option value="${b}">Board ${b}</option>`;
    });
  }

  sel.onchange = loadMatch;
}

// ==========================
async function loadMatch(){

  const sel = document.getElementById("boardSelect");
  if(!sel) return;

  const board = sel.value;

  currentMatch = matches.find(m =>
    m.fields?.BoardId == board &&
    m.fields?.Status === "active"
  );

  // ✅ BYE Handling NACHDEM Match gefunden wurde
  if(currentMatch &&
     (currentMatch.fields.Player1 === "BYE" || currentMatch.fields.Player2 === "BYE")){

    const winner = currentMatch.fields.Player1 === "BYE"
      ? currentMatch.fields.Player2
      : currentMatch.fields.Player1;

  await finishMatch(winner,1,0,0,0,0,0,0,0);
    return;
  }

  if(!currentMatch){
    set("score","-");
    set("legs","-");
    set("turn","-");
    return;
  }

  updateUI();
}


// ==========================
function updateUI(){

  const f = currentMatch.fields;

  const p1 = document.getElementById("p1");
  const p2 = document.getElementById("p2");

  if(!p1 || !p2) return;

  p1.innerText = f.Player1 || "-";
  p2.innerText = f.Player2 || "-";

  p1.className="";
  p2.className="";

  if(f.Turn==="p1"){
    p1.classList.add("activePlayer");
    p2.classList.add("inactivePlayer");
  }else{
    p2.classList.add("activePlayer");
    p1.classList.add("inactivePlayer");
  }

  set("score", `${f.Score1} : ${f.Score2}`);
  set("legs", `Legs ${f.Legs1||0}:${f.Legs2||0}`);

  set("turn", f.Turn==="p1"?f.Player1:f.Player2);

  const darts = f.DartsThrown || 0;
  const scored = (501-f.Score1)+(501-f.Score2);
  const avg = darts>0 ? ((scored/darts)*3).toFixed(1) : 0;

  set("liveAvg", `Avg: ${avg} | Darts: ${darts}`);
}

// ==========================
function set(id,val){
  const el=document.getElementById(id);
  if(el) el.innerHTML=val;
}

// ==========================
function createButtons(){

  const div=document.getElementById("buttons");
  if(!div) return;

  div.innerHTML="";

  for(let i=1;i<=20;i++){
    addBtn(i);
    addBtn("D"+i);
    addBtn("T"+i);
  }

  addBtn("25");
  addBtn("BULL");
}

function addBtn(v){
  const b=document.createElement("button");
  b.innerText=v;
  b.onclick=()=>insert(v);
  document.getElementById("buttons").appendChild(b);
}

// ==========================
function insert(v){
  if(!d1||!d2||!d3) return;
  if(!d1.value) d1.value=v;
  else if(!d2.value) d2.value=v;
  else d3.value=v;
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

// ==========================
async function submit(){

  if(!currentMatch) return;
  if(currentMatch.fields.Status === "finished") return;

  const f = currentMatch.fields;

  let checkoutsP1 = f.CheckoutsP1 || 0;
  let checkoutsP2 = f.CheckoutsP2 || 0;

  let dartsP1 = f.DartsP1 || 0;
  let dartsP2 = f.DartsP2 || 0;

let throwsP1 = f.ThrowsP1 ? JSON.parse(f.ThrowsP1) : [];
let throwsP2 = f.ThrowsP2 ? JSON.parse(f.ThrowsP2) : [];

  let s1 = f.Score1;
  let s2 = f.Score2;
  let l1 = f.Legs1 || 0;
  let l2 = f.Legs2 || 0;
  let turn = f.Turn;

  const total = val(d1.value)+val(d2.value)+val(d3.value);
  const dartsArray = [d1.value, d2.value, d3.value].filter(Boolean);
  const last = d3.value || d2.value || d1.value;
  const target = parseInt(f.LegsToWin) || 3;

  let total180 = f.total180 || 0;
  let highFinish = f.HighFinish || 0;
  
  let coAttP1 = f.CheckoutAttemptsP1 || 0;
  let coAttP2 = f.CheckoutAttemptsP2 || 0;

  // ✅ 180 zählen
  if(total === 180){
    total180++;
  }

  // ✅ Checkout Attempt
  const currentScore = turn === "p1" ? s1 : s2;
  if(currentScore <= 170){
    if(turn === "p1"){
      coAttP1++;
    }else{
      coAttP2++;
    }
  }

  // ==========================
  // ✅ PLAYER 1 TURN
  if(turn === "p1"){

    dartsP1 += 3;

    let ns = s1 - total;

    if(ns === 0 && isDouble(last)){

      checkoutsP1++;
      highFinish = Math.max(highFinish, total);
      l1++;

      if(l1 >= target){
        return await finishMatch(
          f.Player1,
          l1,
          l2,
          total180,
          highFinish,
          coAttP1,
          coAttP2,
          checkoutsP1,
          checkoutsP2
        );
      }

      await update(
        501, 501, "p2", l1, l2,
        dartsP1, dartsP2,
        total180, highFinish,
        coAttP1, coAttP2,
        checkoutsP1, checkoutsP2
      );

    }else{

      if(ns > 1) s1 = ns;

      await update(
        s1, s2, "p2", l1, l2,
        dartsP1, dartsP2,
        total180, highFinish,
        coAttP1, coAttP2,
        checkoutsP1, checkoutsP2
      );
    }
  }

  // ==========================
  // ✅ PLAYER 2 TURN
  else{

    dartsP2 += 3;

    let ns = s2 - total;

    if(ns === 0 && isDouble(last)){

      checkoutsP2++;
      highFinish = Math.max(highFinish, total);
      l2++;

      if(l2 >= target){
        return await finishMatch(
          f.Player2,
          l1,
          l2,
          total180,
          highFinish,
          coAttP1,
          coAttP2,
          checkoutsP1,
          checkoutsP2
        );
      }

      await update(
        501, 501, "p1", l1, l2,
        dartsP1, dartsP2,
        total180, highFinish,
        coAttP1, coAttP2,
        checkoutsP1, checkoutsP2
      );

    }else{

      if(ns > 1) s2 = ns;

      await update(
        s1, s2, "p1", l1, l2,
        dartsP1, dartsP2,
        total180, highFinish,
        coAttP1, coAttP2,
        checkoutsP1, checkoutsP2
      );
    }
  }

  reset();
  await reload();
}


// ========================== Update
async function update(
  s1,
  s2,
  turn,
  l1,
  l2,
  dartsP1,
  dartsP2,
  total180,
  highFinish,
  coAttP1,
  coAttP2,
  checkoutsP1,
  checkoutsP2
){

  const token = await getToken();

  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${currentMatch.id}/fields`,
    {
      method:"PATCH",
      headers:{
        Authorization:`Bearer ${token}`,
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        Score1: s1,
        Score2: s2,
        Turn: turn,
        Legs1: l1,
        Legs2: l2,
        DartsP1: dartsP1 || 0,
        DartsP2: dartsP2 || 0,
        DartsThrown: (dartsP1 || 0) + (dartsP2 || 0),
    CheckoutAttemptsP1: coAttP1 || 0,
CheckoutAttemptsP2: coAttP2 || 0,
CheckoutsP1: checkoutsP1 || 0,
CheckoutsP2: checkoutsP2 || 0,
        ThrowsP1: JSON.stringify(throwsP1 || []),
ThrowsP2: JSON.stringify(throwsP2 || []),
        total180: total180 || 0,
        HighFinish: highFinish || 0
      })
    }
  );
}

// ==========================
// ✅ GROUP → KO (FIXED)
async function autoProgress(){

 const activeTournament = localStorage.getItem("TournamentID");

const all = await getList("Matches");

const groupMatches = all.filter(m =>
  m.fields &&
  m.fields.Mode === "tournament" &&
  m.fields.Round === "group" &&
  String(m.fields.TournamentID) === String(activeTournament)
);


  if(groupMatches.length === 0) return;

  const allFinished = groupMatches.every(m =>
    m.fields.Status === "finished"
  );

  if(!allFinished) return;

  // ✅ WICHTIG: nur starten wenn KEIN KO existiert
  const koExists = matches.some(m =>
    m.fields.Round !== "group"
  );

  if(koExists) return;

  console.log("🔥 Gruppen fertig → starte KO");

  let groups = {};

  groupMatches.forEach(m=>{
    const f = m.fields;

    if(!groups[f.Group]) groups[f.Group]={};

    groups[f.Group][f.Player1]=groups[f.Group][f.Player1]||0;
    groups[f.Group][f.Player2]=groups[f.Group][f.Player2]||0;

    if(f.Winner){
      groups[f.Group][f.Winner]+=2;
    }
  });

  let players=[];

  Object.values(groups).forEach(g=>{
    const sorted=Object.entries(g).sort((a,b)=>b[1]-a[1]);

    if(sorted[0]) players.push(sorted[0][0]);
    if(sorted[1]) players.push(sorted[1][0]);
  });

  players = seedPlayers(fillWithByes(players));

  await createFullKO(players);
}

// ==========================
// ✅ KO PROGRESSION (FIXED)
async function progressKO(){
  const activeTournament = localStorage.getItem("TournamentID");

const list = (await getList("Matches"))
  .filter(m =>
    m.fields &&
    m.fields.Mode === "tournament" &&
    m.fields.TournamentID == activeTournament
  );

  const token = await getToken();

  const order = ["r64","r32","r16","quarter","semi","final"];

  // ==========================
  // ✅ STANDARD KO FLOW
  for(let i=0;i<order.length-1;i++){

    const currentRound = order[i];
    const nextRound = order[i+1];

    const currentMatches = list.filter(m => m.fields.Round === currentRound);
    const nextMatches = list.filter(m => m.fields.Round === nextRound);

    if(currentMatches.length === 0) continue;

    const finished = currentMatches.filter(m => m.fields.Status === "finished");

    // ✅ nur weiter wenn ALLE Matches fertig sind
    if(finished.length !== currentMatches.length) continue;

    const winners = finished.map(m => m.fields.Winner);

    for(let x=0; x<nextMatches.length; x++){

      const p1 = winners[x*2] || "";
      const p2 = winners[x*2+1] || "";

      // ✅ NICHT überschreiben wenn schon gesetzt
      if(nextMatches[x].fields.Player1 && nextMatches[x].fields.Player2){
        continue;
      }

      await fetch(
        `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${nextMatches[x].id}/fields`,
        {
          method:"PATCH",
          headers:{
            Authorization:`Bearer ${token}`,
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            Player1: p1,
            Player2: p2,
            Status:"waiting"
          })
        }
      );
    }
  }

  // ==========================
  // ✅ ROBUSTER SEMI → FINAL FIX
  const semis = list.filter(m => m.fields.Round === "semi");
  const finishedSemis = semis.filter(m => m.fields.Status === "finished");

  if(semis.length === 2 && finishedSemis.length === 2){

    const final = list.find(m => m.fields.Round === "final");
    const third = list.find(m => m.fields.Round === "third");

    if(final){

      const winner1 = finishedSemis[0].fields.Winner;
      const winner2 = finishedSemis[1].fields.Winner;

      const finalAlreadyCorrect =
        final.fields.Player1 === winner1 &&
        final.fields.Player2 === winner2;

      // ✅ NUR setzen wenn wirklich nötig
      if(!finalAlreadyCorrect){

        const losers = finishedSemis.map(m =>
          m.fields.Player1 === m.fields.Winner
            ? m.fields.Player2
            : m.fields.Player1
        );

        // ✅ Finale setzen
        await fetch(
          `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${final.id}/fields`,
          {
            method:"PATCH",
            headers:{
              Authorization:`Bearer ${token}`,
              "Content-Type":"application/json"
            },
            body:JSON.stringify({
              Player1: winner1,
              Player2: winner2,
              Status:"waiting"
            })
          }
        );

        // ✅ Platz 3 setzen
        if(third){
          await fetch(
            `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${third.id}/fields`,
            {
              method:"PATCH",
              headers:{
                Authorization:`Bearer ${token}`,
                "Content-Type":"application/json"
              },
              body:JSON.stringify({
                Player1: losers[0],
                Player2: losers[1],
                Status:"waiting"
              })
            }
          );
        }
      }
    }
  }
}

//Gewinner setzen händisch
async function endMatchWithWinner(player){

  if(!currentMatch){
    alert("Kein Spiel geladen");
    return;
  }

  const confirmEnd = confirm("Match beenden und Sieger setzen?");
  if(!confirmEnd) return;

  const f = currentMatch.fields;

  const winner = player === "p1" ? f.Player1 : f.Player2;

  let l1 = f.Legs1 || 0;
  let l2 = f.Legs2 || 0;

  // ✅ Gewinner bekommt ein Leg
  if(player === "p1"){
    l1++;
  }else{
    l2++;
  }

  // ✅ nutzt dein bestehendes System
  await finishMatch(winner, l1, l2);
}



//spiel zurücksetzen händisch

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
        Score1:501,
        Score2:501,
        Legs1:0,
        Legs2:0,
        Turn:"p1",
        DartsThrown:0,
        
  total180: currentMatch.fields.total180 || 0,
  HighFinish: currentMatch.fields.HighFinish || 0,
  CheckoutAttempts: currentMatch.fields.CheckoutAttempts || 0

      })
    }
  );

  await reload();
}



// ==========================
async function finishMatch(
  winner,
  l1,
  l2,
  total180,
  highFinish,
  coAttP1,
  coAttP2,
  checkoutsP1,
  checkoutsP2
){

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
  BoardId:null,
       
DartsP1: currentMatch.fields.DartsP1 || 0,
DartsP2: currentMatch.fields.DartsP2 || 0,
CheckoutAttemptsP1: coAttP1 || 0,
CheckoutAttemptsP2: coAttP2 || 0,
CheckoutsP1: checkoutsP1 || 0,
CheckoutsP2: checkoutsP2 || 0,

  total180: total180 || 0,
  HighFinish: highFinish || 0
})
    }
  );

  // ✅ GANZ WICHTIG: erst Daten frisch laden!
  await refreshMatches();
  await new Promise(r => setTimeout(r, 300));  // 🔥 API Delay Fix

  // ✅ jetzt erst logisch weiter
  await autoProgress();

  await refreshMatches();
  await new Promise(r => setTimeout(r, 300));

  await progressKO();

  await refreshMatches();
  await new Promise(r => setTimeout(r, 300));

  await fillBoards();
  await reload();
}



//seed Players

function seedPlayers(players){

  players = players.sort(()=>Math.random()-0.5);

  let result = [];

  while(players.length){
    result.push(players.shift());
    if(players.length){
      result.push(players.pop());
    }
  }

  return result;
}


//FillwithBytes

function fillWithByes(players){

  let size = 1;

  while(size < players.length){
    size *= 2;
  }

  while(players.length < size){
    players.push("BYE");
  }

  return players;
}



//FullKO

async function createFullKO(players){

  const token = await getToken();
  const activeTournament = localStorage.getItem("TournamentID");

  const map = {
    64:"r64",
    32:"r32",
    16:"r16",
    8:"quarter",
    4:"semi",
    2:"final"
  };

  const firstRound = map[players.length];

  // ==========================
  // ✅ ERSTE RUNDE
  for(let i=0;i<players.length;i+=2){

    const p1 = players[i];
    const p2 = players[i+1];

    // ✅ FREILOS
    if(p1 === "BYE" || p2 === "BYE"){

      const winner = p1 === "BYE" ? p2 : p1;

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
              Player1:p1 || "",
              Player2:p2 || "",
              Score1:501,
              Score2:501,
              Legs1:0,
              Legs2:0,
              LegsToWin:3,
              BoardId:null,
              Turn:"p1",
              Status:"finished",
              Group:"",
              Winner: winner,
              Round:firstRound,
              Mode:"tournament",
              TournamentID: activeTournament
            }
          })
        }
      );

      continue;
    }

    // ✅ NORMALES MATCH
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
            Player1:p1 || "",
            Player2:p2 || "",
            Score1:501,
            Score2:501,
            Legs1:0,
            Legs2:0,
            LegsToWin:3,
            BoardId:null,
            Turn:"p1",
            Status:"waiting",
            Group:"",
            Winner:"",
            Round:firstRound,
            Mode:"tournament",
            TournamentID: activeTournament
          }
        })
      }
    );
  }

  // ==========================
  // ✅ FOLGERUNDEN
  let next = players.length / 2;

  while(next >= 2){

    const roundName = map[next];

    for(let i=0;i<next/2;i++){

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
              Title:`TBD vs TBD`,
              Player1:"",
              Player2:"",
              Score1:501,
              Score2:501,
              Legs1:0,
              Legs2:0,
              LegsToWin:3,
              BoardId:null,
              Turn:"p1",
              Status:"waiting",
              Group:"",
              Winner:"",
              Round:roundName,
              Mode:"tournament",
              TournamentID: activeTournament
            }
          })
        }
      );
    }

    next /= 2;
  }

  // ==========================
  // ✅ SPIEL UM PLATZ 3
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
          Title:`TBD vs TBD`,
          Player1:"",
          Player2:"",
          Score1:501,
          Score2:501,
          Legs1:0,
          Legs2:0,
          LegsToWin:3,
          BoardId:null,
          Turn:"p1",
          Status:"waiting",
          Group:"",
          Winner:"",
          Round:"third",
          Mode:"tournament",
          TournamentID: activeTournament
        }
      })
    }
  );

  // ✅ DIREKT STARTEN
  await fillBoards();
}

// ==========================
async function reload(){

  const sel=document.getElementById("boardSelect");
  const current=sel?.value;

  await refreshMatches();
  buildBoardSelect();

  if(sel && current){
    sel.value=current;
  }

  loadMatch();
}

function reset(){
  d1.value="";
  d2.value="";
  d3.value="";
}
