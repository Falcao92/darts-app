let matches = [];
let currentMatch = null;
let mode = "tournament";

window.addEventListener("DOMContentLoaded", init);


// ==========================
async function init(){

  const ok = await ensureLogin();
  if (!ok) return;

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
// ✅ BOARDS FIXED
// ==========================
function buildBoardSelect(){

  const sel = document.getElementById("boardSelect");
  if(!sel) return;

  sel.innerHTML = "";

  const boardCount = parseInt(localStorage.getItem("boardCount")) || 2;

  for(let i=1;i<=boardCount;i++){
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
// ✅ UPDATE
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
        BoardId:"" // ✅ WICHTIG
      })
    }
  );

  await fillBoards(); // ✅ nächstes Spiel holen
  await reload();
}



// ==========================
// ✅ BOARD VERWALTUNG (KERNELEMENT)
// ==========================
async function fillBoards(){

  await refreshMatches();

  const boardCount = parseInt(localStorage.getItem("boardCount")) || 2;

  const active = matches.filter(m => m.fields.Status === "active");
  const waiting = matches.filter(m => m.fields.Status === "waiting");

  if(waiting.length === 0) return;

  let usedBoards = active.map(m => m.fields.BoardId);
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
async function reload(){

  await refreshMatches();
  buildBoardSelect();
  loadMatch();
}


function reset(){
  d1.value="";
  d2.value="";
  d3.value="";
}
