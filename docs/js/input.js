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
}

// ==========================
async function refreshMatches(){

  const all = await getList("Matches");

  matches = all.filter(m=>{
    if(!m.fields) return false;

    if(mode==="training"){
      return m.fields.Mode==="training";
    }

    if(mode==="tournament"){
      return m.fields.Mode==="tournament" || m.fields.Round;
    }

    return false;
  });
}

// ==========================
async function fillBoards(){

  await refreshMatches(); // ✅ wichtig

  const boardCount = parseInt(localStorage.getItem("boardCount")) || 2;

  const active = matches.filter(m => m.fields.Status === "active");
  const waiting = matches.filter(m => m.fields.Status === "waiting");

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

  await refreshMatches(); // ✅ ganz wichtig
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
function loadMatch(){

  const sel = document.getElementById("boardSelect");
  if(!sel) return;

  const board = sel.value;

  currentMatch = matches.find(m =>
    m.fields?.BoardId == board &&
    m.fields?.Status === "active"
  );

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

  const currentPlayer =
    f.Turn==="p1" ? f.Player1 : f.Player2;

  set("turn", currentPlayer);

  const darts = f.DartsThrown || 0;
  const scored = (501 - f.Score1)+(501 - f.Score2);
  const avg = darts > 0 ? ((scored/darts)*3).toFixed(1) : 0;

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

  const f=currentMatch.fields;

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
      await update(s1,s2,"p2",l1,l2,darts);
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
      await update(s1,s2,"p1",l1,l2,darts);
    }
  }

  reset();
  await reload();
}

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
        DartsThrown:darts
      })
    }
  );
}

// ==========================
// ✅ GROUP → KO
async function autoProgress(){

  const group = matches.filter(m =>
    m.fields && m.fields.Round === "group"
  );

  if(group.length === 0) return;

  const allFinished = group.every(m =>
    m.fields.Status === "finished"
  );

  if(!allFinished) return;

  const exists = matches.some(m =>
    m.fields.Round === "semi" &&
    m.fields.Player1 &&
    m.fields.Player2
  );

  if(exists) return;

  await startKO();
}

// ==========================
async function startKO(){

  await refreshMatches();

  let groups={};

  matches.filter(m=>m.fields.Round==="group")
    .forEach(m=>{
      const f=m.fields;

      if(!groups[f.Group]) groups[f.Group]={};

      groups[f.Group][f.Player1]=groups[f.Group][f.Player1]||0;
      groups[f.Group][f.Player2]=groups[f.Group][f.Player2]||0;

      if(f.Winner) groups[f.Group][f.Winner]+=2;
    });

  let players=[];

  Object.values(groups).forEach(g=>{
    const sorted=Object.entries(g).sort((a,b)=>b[1]-a[1]);
    players.push(sorted[0][0]);
    if(sorted[1]) players.push(sorted[1][0]);
  });

  if(players.length<4) return;

  await create(players[0],players[1],"semi");
  await create(players[2],players[3],"semi");

  await fillBoards();
}

// ==========================
async function handleSemiFinals(){

  await refreshMatches();

  const semis = matches.filter(m => m.fields.Round === "semi");
  const finished = semis.filter(m => m.fields.Status === "finished");

  if(finished.length !== 2) return;

  const exists = matches.some(m => m.fields.Round === "final");
  if(exists) return;

  let winners=[];
  let losers=[];

  finished.forEach(m=>{
    const f=m.fields;
    winners.push(f.Winner);
    losers.push(f.Player1===f.Winner?f.Player2:f.Player1);
  });

  await create(winners[0], winners[1], "final");
  await create(losers[0], losers[1], "third");

  await fillBoards();
}

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
  await autoProgress();
  await refreshMatches();
  await handleSemiFinals();
  await refreshMatches();

  await fillBoards();
  await reload();
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
