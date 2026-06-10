let matches = [];
let currentMatch = null;
let mode = "tournament";

window.addEventListener("DOMContentLoaded", init);


// ==========================
async function init(){

  const ok = await ensureLogin();
  if (!ok) return;

  // ✅ MODE SWITCH
  const modeSelect = document.getElementById("modeSelect");
  if(modeSelect){
    modeSelect.onchange = async (e)=>{
      mode = e.target.value;
      await refreshMatches();
      buildBoardSelect();
      loadMatch();
    };
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
async function refreshMatches(){
  matches = await getList(getListName()) || [];
}


// ==========================
function buildBoardSelect(){

  const sel = document.getElementById("boardSelect");
  if(!sel) return;

  sel.innerHTML = "";

  const boards = [...new Set(matches.map(m => m.fields?.BoardId))];

  boards.forEach(b=>{
    sel.innerHTML += `<option value="${b}">Board ${b}</option>`;
  });

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
    } else {
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
    } else {
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
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${getListName()}/items/${currentMatch.id}/fields`,
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
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${getListName()}/items/${currentMatch.id}/fields`,
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

  // ✅ nur Turnier beeinflusst KO
  if(mode === "tournament"){
    await handleKORound(f, winner);
    await autoProgress();
  }

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

  const existingFinal = matches.some(m => m.fields.Round === "final");
  if(existingFinal) return;

  let winners = [];
  let losers = [];

  finished.forEach(m => {

    const f = m.fields;

    winners.push(f.Winner);

    const loser = (f.Player1 === f.Winner) ? f.Player2 : f.Player1;

    losers.push(loser);
  });

  const token = await getToken();

  // Finale
  await create(winners[0], winners[1], "final", 1, token);

  // Platz 3
  await create(losers[0], losers[1], "third", 2, token);
}


// ==========================
async function autoProgress(){

  await refreshMatches();

  const group = matches.filter(m =>
    m.fields && m.fields.Round === "group"
  );

  if(group.length === 0) return;

  const ready = group.every(m =>
    m.fields.Status === "finished"
  );

  if(ready){
    await startKO();
    return;
  }
}


// ==========================
async function startKO(){

  await refreshMatches();

  const hasKO = matches.some(m => m.fields.Round === "semi");
  if(hasKO) return;

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

  Object.values(groups).forEach(group => {

    const sorted = Object.entries(group)
      .sort((a,b) => b[1] - a[1]);

    players.push(sorted[0][0]);
    if(sorted[1]) players.push(sorted[1][0]);
  });

  if(players.length < 4) return;

  await create(players[0], players[1], "semi", 1);
  await create(players[2], players[3], "semi", 2);
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
async function reload(){

  const sel = document.getElementById("boardSelect");
  if(!sel) return;

  const currentBoard = sel.value;

  await refreshMatches();
  buildBoardSelect();

  if([...sel.options].some(o => o.value === currentBoard)){
    sel.value = currentBoard;
  }

  loadMatch();
}


// ==========================
function reset(){
  d1.value="";
  d2.value="";
  d3.value="";
}
