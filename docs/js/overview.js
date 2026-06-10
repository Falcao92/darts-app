window.addEventListener("DOMContentLoaded", async () => {

  const ok = await ensureLogin();
  if (!ok) return;

  update();

  setInterval(update, 3000);
});


async function update(){

  const matches = await getList("Matches");

  renderBoards(matches);
  renderGroups(matches);
}


// ===================================
// 📺 BOARDS
// ===================================
function renderBoards(matches){

  const div = document.getElementById("boards");

  const BOARD_COUNT = parseInt(localStorage.getItem("boardCount")) || 5;

  let html = "";

  for(let boardId = 1; boardId <= BOARD_COUNT; boardId++){

    const boardMatches = matches.filter(m =>
      m.fields &&
      m.fields.BoardId == boardId &&
      m.fields.Round === "group"
    );

    const live = boardMatches.find(m =>
      m.fields.Status === "active"
    );

    const queue = boardMatches.filter(m =>
      m.fields.Status === "waiting"
    );

    const next = queue[0];

    html += `<div class="board">`;
    html += `<div class="title">Board ${boardId}</div>`;

    if(live){
      html += `
        <div class="live">
          ${live.fields.Player1} vs ${live.fields.Player2}<br>
          ${live.fields.Score1} : ${live.fields.Score2}
        </div>
      `;
    } else {
      html += `<div>frei</div>`;
    }

    if(next){
      html += `
        <div class="next">
          Next:<br>
          ${next.fields.Player1} vs ${next.fields.Player2}
        </div>
      `;
    }

    html += `</div>`;
  }

  div.innerHTML = html;
}


// ===================================
// 🧩 GROUP TABLE WITH STATS
// ===================================
function renderGroups(matches){

  const div = document.getElementById("groups");

  // ✅ gespeicherte Gruppen laden
  const groups = JSON.parse(localStorage.getItem("groups") || "[]");

  if(groups.length === 0){
    div.innerHTML = "<p>Keine Gruppen</p>";
    return;
  }

  let html = "";

  groups.forEach((groupArr, index) => {

    const groupId = String.fromCharCode(65 + index);

    // ✅ Stats nur für diese Gruppe
    let stats = {};

    groupArr.forEach(name => {
      stats[name] = {
        name,
        played: 0,
        wins: 0,
        points: 0,
        legsFor: 0,
        legsAgainst: 0
      };
    });

    // ✅ Matches dieser Gruppe berechnen
    matches.forEach(m => {

      const f = m.fields;

      if(f.Group !== groupId || f.Round !== "group") return;

      if(f.Status === "finished"){

        const p1 = stats[f.Player1];
        const p2 = stats[f.Player2];

        if(!p1 || !p2) return;

        p1.played++;
        p2.played++;

        p1.legsFor += f.Legs1 || 0;
        p1.legsAgainst += f.Legs2 || 0;

        p2.legsFor += f.Legs2 || 0;
        p2.legsAgainst += f.Legs1 || 0;

        if(f.Winner){
          stats[f.Winner].wins++;
          stats[f.Winner].points += 2;
        }
      }
    });

    // ✅ umwandeln → array
    let players = Object.values(stats);

    // ✅ berechnen
    players.forEach(p => {
      p.diff = p.legsFor - p.legsAgainst;
      p.avg = p.played > 0
        ? (p.legsFor * 501) / (p.played * 15)
        : 0;
    });

    // ✅ sortieren
    players.sort((a,b)=>
      b.points - a.points ||
      b.diff - a.diff
    );

    html += `
      <div class="group">
        <b>Gruppe ${groupId}</b>
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


// ==========================
// BUILD TABLES
// ==========================
function buildTables(groups, div){

  let html = "";

  Object.keys(groups).sort().forEach(group => {

    let players = Object.values(groups[group]);

    players.forEach(p => {
      p.diff = p.legsFor - p.legsAgainst;

      // einfacher Average
      p.avg = p.played > 0
        ? (p.legsFor * 501) / (p.played * 15)
        : 0;
    });

    players.sort((a,b) =>
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
