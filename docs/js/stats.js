window.addEventListener("DOMContentLoaded", init);

async function init(){

  const ok = await ensureLogin();
  if (!ok) return;

  const players = await getList("Players");
  const matches = await getList("Matches");

  const sel = document.getElementById("playerSelect");

  players.forEach(p=>{
    sel.innerHTML += `<option value="${p.fields.Title}">${p.fields.Title}</option>`;
  });

  sel.onchange = () => showStats(matches, sel.value);

  if(players.length){
    showStats(matches, players[0].fields.Title);
  }
}

// ==========================
// ✅ STATS BERECHNEN
function calculateStats(matches, player){

  let games=0,wins=0,legsWon=0,legsLost=0,darts=0,scored=0,co=0;

  matches.forEach(m=>{

    const f=m.fields;
    if(!f || f.Status!=="finished") return;

    if(f.Player1!==player && f.Player2!==player) return;

    games++;

    const isP1 = f.Player1===player;

    const score = isP1?f.Score1:f.Score2;
    const legs = isP1?f.Legs1:f.Legs2;

    legsWon += legs;
    legsLost += isP1?f.Legs2:f.Legs1;

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
    losses:games-wins,
    avg: darts>0?((scored/darts)*3).toFixed(2):0,
    checkout:(games>0?(co/games*100).toFixed(1):0)
  };
}

// ==========================
// ✅ STATS ANZEIGEN
function showStats(matches, player){

  const s = calculateStats(matches, player);

  document.getElementById("stats").innerHTML = `
    <div class="stat">🎯 Spiele: <span class="highlight">${s.games}</span></div>
    <div class="stat">✅ Siege: <span class="highlight">${s.wins}</span></div>
    <div class="stat">❌ Niederlagen: <span class="highlight">${s.losses}</span></div>
    <div class="stat">📊 Avg: <span class="highlight">${s.avg}</span></div>
    <div class="stat">🎯 Checkout: <span class="highlight">${s.checkout}%</span></div>
  `;
}
