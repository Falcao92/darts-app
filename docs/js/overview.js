window.addEventListener("DOMContentLoaded", async () => {

  const ok = await ensureLogin();
  if (!ok) return;

  update();
  setInterval(update, 3000);
});


async function update(){

  const matches = await getList("Matches");

  renderBoards(matches);
  renderGroups(matches);   // ✅ FIX
  renderBracket(matches);  // ✅ FIX
}


// =======================
// BOARDS
// =======================
function renderBoards(matches){

  const div = document.getElementById("boards");

  let html = "";

  const boards = [...new Set(matches.map(m => m.fields.BoardId))];

  boards.forEach(board => {

    const m = matches.find(x =>
      x.fields.BoardId == board &&
      x.fields.Status === "active"
    );

    html += `<div class="board">Board ${board}<br>`;

    if(m){
      const f = m.fields;
      html += `${f.Player1} vs ${f.Player2}<br>${f.Score1}:${f.Score2}`;
    } else {
      html += "frei";
    }

    html += "</div>";
  });

  div.innerHTML = html;
}


// =======================
// ✅ GROUPS (FIXED)
// =======================
function renderGroups(matches){

  const div = document.getElementById("groups");

  let groups = {};

  // ==========================
  // DATEN SAMMELN
  // ==========================
  matches.forEach(m => {

    const f = m.fields;

    if(f.Round !== "group" || !f.Group) return;

    if(!groups[f.Group]){
      groups[f.Group] = {};
    }

    // Spieler initialisieren
    if(!groups[f.Group][f.Player1]){
      groups[f.Group][f.Player1] = createStats(f.Player1);
    }

    if(!groups[f.Group][f.Player2]){
      groups[f.Group][f.Player2] = createStats(f.Player2);
    }

    // ✅ nur fertige Spiele zählen
    if(f.Status === "finished"){

      const p1 = groups[f.Group][f.Player1];
      const p2 = groups[f.Group][f.Player2];

      p1.played++;
      p2.played++;

      // Legs
      p1.legsFor += f.Legs1 || 0;
      p1.legsAgainst += f.Legs2 || 0;

      p2.legsFor += f.Legs2 || 0;
      p2.legsAgainst += f.Legs1 || 0;

      // Punkte
      if(f.Winner){
        groups[f.Group][f.Winner].wins++;
        groups[f.Group][f.Winner].points += 2;
      }
    }
  });

  // ==========================
  // TABLE RENDER
  // ==========================
  let html = "";

  Object.keys(groups).sort().forEach(group => {

    let players = Object.values(groups[group]);

    players.forEach(p => {
      p.diff = p.legsFor - p.legsAgainst;
      p.avg = p.played > 0
        ? (p.legsFor * 501) / (p.played * 15)
        : 0;
    });

    // ✅ SORTIERUNG
    players.sort((a,b)=>
      b.points - a.points ||
      b.diff - a.diff
    );

    html += `
      <div class="group">
        <b>Gruppe ${group}</b>
        <table>
          <tr>
            <th>Name</th>
            <th>S</th>
            <th>W</th>
            <th>P</th>
            <th>Diff</th>
            <th>Avg</th>
          </tr>
    `;

    players.forEach(p => {

      html += `
        <tr>
          <td>${p.name}</td>
          <td>${p.played}</td>
          <td>${p.wins}</td>
          <td>${p.points}</td>
          <td>${p.diff}</td>
          <td>${p.avg.toFixed(1)}</td>
        </tr>
      `;
    });

    html += "</table></div>";
  });

  div.innerHTML = html;
}


// ==========================
// PLAYER TEMPLATE
// ==========================
function createStats(name){
  return {
    name,
    played: 0,
    wins: 0,
    points: 0,
    legsFor: 0,
    legsAgainst: 0
  };
}


// =======================
// ✅ BRACKET (FIXED)
// =======================
function renderBracket(matches){

  const div = document.getElementById("bracket");

  const ko = matches.filter(m =>
    m.fields &&
    m.fields.Round !== "group"
  );

  if(ko.length === 0){
    div.innerHTML = "<p>Keine KO Phase</p>";
    return;
  }

  const order = ["last16","quarter","semi","final"];

  let rounds = {};

  order.forEach(r => rounds[r] = []);

  ko.forEach(m => {
    const r = m.fields.Round;
    if(rounds[r]) rounds[r].push(m);
  });

  let html = "";

  order.forEach(r => {

    if(rounds[r].length === 0) return;

    html += `<div class="round"><b>${label(r)}</b>`;

    rounds[r].forEach(m => {

      const f = m.fields;

      html += `
        <div class="match">
          <div class="${f.Winner === f.Player1 ? "winner" : ""}">
            ${f.Player1 || "-"}
          </div>
          <div class="${f.Winner === f.Player2 ? "winner" : ""}">
            ${f.Player2 || "-"}
          </div>
        </div>
      `;
    });

    html += "</div>";
  });

  div.innerHTML = html;
}


// =======================
// LABELS
// =======================
function label(r){

  if(r==="last16") return "Achtelfinale";
  if(r==="quarter") return "Viertelfinale";
  if(r==="semi") return "Halbfinale";
  if(r==="final") return "Finale";

  return r;
}
