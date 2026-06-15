let players = [];
let matches = [];
let sortMode = "winrate";

window.addEventListener("DOMContentLoaded", init);

// ==========================
async function init(){

  const ok = await ensureLogin();
  if(!ok) return;

  players = await getList("Players");
  matches = await getList("Matches");

  buildPlayerSelect();
  buildLeaderboard();
}

// ==========================
// ✅ PLAYER DROPDOWN
function buildPlayerSelect(){

  const sel = document.getElementById("playerSelect");

  players.forEach(p=>{
    sel.innerHTML += `<option value="${p.fields.Title}">${p.fields.Title}</option>`;
  });

  sel.onchange = () => showPlayerStats(sel.value);

  if(players.length){
    showPlayerStats(players[0].fields.Title);
  }
}

// ==========================
// ✅ STATS CORE
function calculateStats(player){

  let games=0,wins=0,darts=0,scored=0,co=0;

  matches.forEach(m=>{

    const f = m.fields;
    if(!f || f.Status!=="finished") return;

    if(f.Player1!==player && f.Player2!==player) return;

    games++;

    const isP1 = f.Player1===player;
    const score = isP1 ? f.Score1 : f.Score2;

    if(f.Winner===player){
      wins++;
      co++;
    }

    darts += f.DartsThrown || 0;
    scored += (501-score);
  });

  return {
    games,
    wins,
    losses: games-wins,
    avg: darts>0?((scored/darts)*3).toFixed(2):0,
    winrate: games>0?((wins/games)*100).toFixed(1):0,
    checkout: games>0?((co/games)*100).toFixed(1):0
  };
}

// ==========================
// ✅ PLAYER STATS UI
function showPlayerStats(player){

  const s = calculateStats(player);

  document.getElementById("playerStats").innerHTML = `
    <div class="stat">🎯 Spiele<br>${s.games}</div>
    <div class="stat">✅ Siege<br>${s.wins}</div>
    <div class="stat">❌ Niederlagen<br>${s.losses}</div>
    <div class="stat">📊 Avg<br>${s.avg}</div>
    <div class="stat">🎯 Checkout<br>${s.checkout}%</div>
    <div class="stat">🏆 Winrate<br>${s.winrate}%</div>
  `;
}

// ==========================
// ✅ LEADERBOARD
function buildLeaderboard(){

  const tbody = document.getElementById("leaderboard");

  let data = players.map(p=>{
    const name = p.fields.Title;
    return { name, ...calculateStats(name) };
  });

  // sorting
  data.sort((a,b)=>{
    return sortMode==="avg"
      ? b.avg - a.avg
      : b.winrate - a.winrate;
  });

  tbody.innerHTML="";

  data.forEach((p,i)=>{

    let rankClass = "";
    if(i===0) rankClass="rank1";
    if(i===1) rankClass="rank2";
    if(i===2) rankClass="rank3";

    tbody.innerHTML += `
      <tr>
        <td class="${rankClass}">${i+1}</td>
        <td>${p.name}</td>
        <td>${p.games}</td>
        <td>${p.wins}</td>
        <td>${p.avg}</td>
        <td>${p.checkout}%</td>
        <td>${p.winrate}%</td>
      </tr>
    `;
  });
}

// ==========================
// ✅ SORT
function setSort(mode){

  sortMode = mode;

  document.querySelectorAll(".sortBtn")
    .forEach(b=>b.classList.remove("activeSort"));

  event.target.classList.add("activeSort");

  buildLeaderboard();
}
