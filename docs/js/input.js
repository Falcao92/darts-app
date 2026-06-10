let matches = [];
let currentMatch = null;


// ==========================
window.addEventListener("DOMContentLoaded", init);


// ==========================
async function init(){

  const ok = await ensureLogin();
  if (!ok) return;

  await refreshMatches();
  buildBoardSelect();
  createButtons();
  loadMatch();
}


// ==========================
async function refreshMatches(){
  matches = await getList("Matches") || [];
}


// ==========================
function buildBoardSelect(){

  const sel = document.getElementById("boardSelect");
  sel.innerHTML = "";

  const boards = [...new Set(matches.map(m => m.fields.BoardId))];

  boards.forEach(b=>{
    sel.innerHTML += `<option value="${b}">Board ${b}</option>`;
  });

  sel.onchange = loadMatch;
}


// ==========================
function loadMatch(){

  const board = document.getElementById("boardSelect").value;

  currentMatch = matches.find(m =>
    m.fields &&
    m.fields.BoardId == board &&
    m.fields.Status === "active"
  );

  if(!currentMatch){
    set("players","Kein Spiel");
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

  set("players", `${f.Player1} vs ${f.Player2}`);
  set("score", `${f.Score1} : ${f.Score2}`);
  set("legs", `Legs ${f.Legs1||0}:${f.Legs2||0}`);
  set("turn", f.Turn==="p1"?f.Player1:f.Player2);
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
}

function addBtn(v){

  const b=document.createElement("button");
  b.innerText=v;
  b.className="btn";
  b.onclick=()=>insert(v);

  document.getElementById("buttons").appendChild(b);
}


// ==========================
function insert(v){

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

      await update(501,501,"p2",l1,l2);
    }
    else{
      if(ns>1) s1=ns;
      turn="p2";
      await update(s1,s2,turn,l1,l2);
    }

  }else{

    let ns=s2-total;

    if(ns===0 && isDouble(last)){
      l2++;

      if(l2>=target){
        await finishMatch(f.Player2,l1,l2);
        return;
      }

      await update(501,501,"p1",l1,l2);
    }
    else{
      if(ns>1) s2=ns;
      turn="p1";
      await update(s1,s2,turn,l1,l2);
    }
  }

  reset();
  await reload();
}


// ==========================
async function update(s1,s2,turn,l1,l2){

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
        Legs2:l2
      })
    }
  );
}


// ==========================
async function finishMatch(winner,l1,l2){

  const token=await getToken();
  const f=currentMatch.fields;

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
        Status:"finished"
      })
    }
  );

  // ✅ WICHTIG: warten + neu laden
  await refreshMatches();

  // ✅ DANN Logik starten
  await autoProgress();

  // ✅ UI zuletzt
  await reload();
}


// ==========================
// ✅ KO LOGIK
// ==========================
async function handleKORound(matchFields, winner){

  if(matchFields.Round === "semi"){
    await handleSemiFinals();
  }

  if(matchFields.Round === "final"){
    alert("🏆 Turniersieger: " + winner);
  }

  if(matchFields.Round === "third"){
    alert("🥉 Platz 3: " + winner);
  }
}


// ==========================
async function handleSemiFinals(){

  await refreshMatches();

  const semis = matches.filter(m => m.fields.Round === "semi");
  const finished = semis.filter(m => m.fields.Status === "finished");

  if(finished.length !== 2) return;

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

  await createFinalAndThird(winners, losers);
}


// ==========================
async function createFinalAndThird(finalists, losers){

  const token = await getToken();

  await create(finalists[0], finalists[1], "final", 1, token);
  await create(losers[0], losers[1], "third", 2, token);
}


// ==========================
// ✅ FIXED AUTO PROGRESS
// ==========================
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

    console.log("🔥 STARTE KO");

    await startKO();

    return;
  }

  await fillBoards();
}

// ==========================
async function startKO(){

  await refreshMatches();

  const hasKO = matches.some(m => m.fields.Round === "semi");
  if(hasKO){
    console.log("KO existiert bereits");
    return;
  }

  let winners = matches
    .filter(m => m.fields.Round === "group")
    .map(m => m.fields.Winner)
    .filter(Boolean);

  winners = [...new Set(winners)];

  console.log("Winners:", winners);

  if(winners.length < 4){
    console.log("⛔ nicht genug Spieler");
    return;
  }

  await create(winners[0], winners[1], "semi", 1);
  await create(winners[2], winners[3], "semi", 2);

  console.log("✅ KO erstellt");
}


// ==========================
async function create(p1,p2,round,board,token=null){

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
          BoardId:String(board),
          Turn:"p1",
          Status:"active",
          Round:round
        }
      })
    }
  );
}


// ==========================
async function fillBoards(){

  await refreshMatches();

  const waiting = matches.filter(m=>m.fields.Status==="waiting");

  if(waiting.length===0) return;

  const token=await getToken();

  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${waiting[0].id}/fields`,
    {
      method:"PATCH",
      headers:{
        Authorization:`Bearer ${token}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({Status:"active"})
    }
  );
}


// ==========================
async function reload(){

  const currentBoard = document.getElementById("boardSelect").value;

  await refreshMatches();
  buildBoardSelect();

  if([...document.getElementById("boardSelect").options].some(o => o.value === currentBoard)){
    document.getElementById("boardSelect").value = currentBoard;
  }

  loadMatch();
}


// ==========================
function reset(){
  d1.value="";
  d2.value="";
  d3.value="";
}
