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
  sel.innerHTML = "";

  players.forEach(p=>{
    sel.innerHTML += `<option value="${p.fields.Title}">${p.fields.Title}</option>`;
  });

  sel.onchange = () => showPlayerStats(sel.value);

  if(players.length){
    showPlayerStats(players[0].fields.Title);
  }
}

// ==========================
// ✅ ADVANCED STATS
function calculateAdvancedStats(player){

  let games = 0, wins = 0;
  let darts = 0, scored = 0;
  let total180 = 0;
  let bestFinish = 0;
  let coHits = 0, coAttempts = 0;

  matches.forEach(m => {

    const f = m.fields;
    if(!f || f.Status !== "finished") return;
    if(f.Player1 !== player && f.Player2 !== player) return;

    games++;

    const isP1 = f.Player1 === player;

    // ✅ Gewinner
    if(f.Winner === player){
      wins++;
      coHits++;
    }

    // ✅ KORREKT: Punkte aus Legs
    const legs = isP1 ? (f.Legs1 || 0) : (f.Legs2 || 0);
    const points = legs * 501;

    // ✅ KORREKT: Darts anteilig (50/50 Näherung)

const playerDarts = isP1
  ? (f.DartsP1 || 0)
  : (f.DartsP2 || 0);


    darts += playerDarts;
    scored += points;

    // ✅ einfache Stats
    total180 += f.total180 || 0;
    bestFinish = Math.max(bestFinish, f.HighFinish || 0);
    coAttempts += f.CheckoutAttempts || 0;

  });

  return {
    games,
    wins,
    losses: games - wins,

    // ✅ echte Avg
    avg: darts > 0 ? ((scored / darts) * 3).toFixed(2) : 0,

    winrate: games > 0 ? ((wins / games) * 100).toFixed(1) : 0,
    total180,
    bestFinish,
    coRate: coAttempts > 0 ? ((coHits / coAttempts) * 100).toFixed(1) : 0
  };
}
// ==========================
// ✅ PLAYER STATS UI
function showPlayerStats(player){

  const s = calculateAdvancedStats(player);

  document.getElementById("playerStats").innerHTML = `
    <div class="stat">🎯 Spiele<br>${s.games}</div>
    <div class="stat">✅ Siege<br>${s.wins}</div>
    <div class="stat">❌ Niederlagen<br>${s.losses}</div>

    <div class="stat">📊 Avg<br>${s.avg}</div>
    <div class="stat">🏆 Winrate<br>${s.winrate}%</div>

    <div class="stat">💥 180er<br>${s.total180}</div>
    <div class="stat">🔥 Best Finish<br>${s.bestFinish}</div>
    <div class="stat">🎯 Checkout<br>${s.coRate}%</div>
  `;
}

// ==========================
// ✅ BADGE SYSTEM
function getBadge(p){

  if(Number(p.avg) > 70) return "🔥 PRO";
  if(Number(p.avg) > 60) return "💪 Strong";
  if(Number(p.avg) > 50) return "👍 Solid";

  return "";
}

// ==========================
// ✅ LEADERBOARD
function buildLeaderboard(){

  const tbody = document.getElementById("leaderboard");

  let data = players.map(p=>{
    const name = p.fields.Title;
    return { name, ...calculateAdvancedStats(name) };
  });

  // ✅ optional: Spieler ohne Spiele ausblenden
  data = data.filter(p => p.games > 0);

  // ✅ SORT
  data.sort((a,b)=>{
    return sortMode === "avg"
      ? Number(b.avg) - Number(a.avg)
      : Number(b.winrate) - Number(a.winrate);
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
        <td>${p.name} ${getBadge(p)}</td>
        <td>${p.games}</td>
        <td>${p.wins}</td>
        <td>${p.avg}</td>
        <td>${p.coRate}%</td>
        <td>${p.winrate}%</td>
      </tr>
    `;
  });
}

// ==========================
// ✅ SORT BUTTONS
function setSort(mode){

  sortMode = mode;

  document.querySelectorAll(".sortBtn")
    .forEach(b=>b.classList.remove("activeSort"));

  event.target.classList.add("activeSort");

  buildLeaderboard();
}
