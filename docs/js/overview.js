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
// 📺 BOARDS (OHNE ALT-DATEN)
// ===================================
function renderBoards(matches){

  const div = document.getElementById("boards");

  const BOARD_COUNT = parseInt(localStorage.getItem("boardCount")) || 5;

  let html = "";

  for(let boardId = 1; boardId <= BOARD_COUNT; boardId++){

    // ✅ NUR Turnier-Matches
    const boardMatches = matches.filter(m =>
      m.fields &&
      m.fields.BoardId == boardId &&
      m.fields.Round === "group"
    );

    // ✅ LIVE MATCH
    const live = boardMatches.find(m =>
      m.fields.Status === "active"
    );

    // ✅ NUR WAITING (richtige Queue!)
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
// 🧩 GRUPPEN (FIXED!)
// ===================================
function renderGroups(matches){

  const div = document.getElementById("groups");

  let groups = {};

  // ✅ Tabellenstruktur bauen
  matches.forEach(m => {

    const f = m.fields;

    // 👉 nur Gruppenspiele
    if(!f.Group || f.Round !== "group") return;

    if(!groups[f.Group]){
      groups[f.Group] = {};
    }

    // Spieler initialisieren
    if(!groups[f.Group][f.Player1]){
      groups[f.Group][f.Player1] = {
        name: f.Player1,
        played: 0,
        wins: 0,
        points: 0
      };
    }

    if(!groups[f.Group][f.Player2]){
      groups[f.Group][f.Player2] = {
        name: f.Player2,
        played: 0,
        wins: 0,
        points: 0
      };
    }

    // ✅ nur fertige Spiele zählen
    if(f.Status === "finished"){

      groups[f.Group][f.Player1].played++;
      groups[f.Group][f.Player2].played++;

      if(f.Winner){
        groups[f.Group][f.Winner].wins++;
        groups[f.Group][f.Winner].points += 2;
      }
    }
  });


  // ✅ HTML bauen
  let html = "";

  Object.keys(groups).sort().forEach(group => {

    let players = Object.values(groups[group]);

    // ✅ sortieren nach Punkten
    players.sort((a,b) => b.points - a.points);

    html += `
      <div class="group">
        <b>Gruppe ${group}</b>
        <table style="width:100%; margin-top:5px;">
          <tr>
            <th>Name</th>
            <th>S</th>
            <th>W</th>
            <th>P</th>
          </tr>
    `;

    players.forEach(p => {
      html += `
        <tr>
          <td>${p.name}</td>
          <td>${p.played}</td>
          <td>${p.wins}</td>
          <td>${p.points}</td>
        </tr>
      `;
    });

    html += "</table></div>";
  });

  div.innerHTML = html;
}
