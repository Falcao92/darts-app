window.addEventListener("DOMContentLoaded", async () => {

  const ok = await ensureLogin();
  if (!ok) return;

  update();
  setInterval(update, 3000);
});


// ==========================
// 🔄 MAIN UPDATE
// ==========================
async function update(){

  const all = await getList("Matches");

  const tournamentMatches = all.filter(m =>
    m.fields && m.fields.Mode === "tournament"
  );

  const trainingMatches = all.filter(m =>
    m.fields && m.fields.Mode === "training"
  );

  const hasTournament = tournamentMatches.length > 0;

  if(hasTournament){

    renderBoards(tournamentMatches);
    renderGroups(tournamentMatches);
    renderBracket(tournamentMatches);

    // ✅ Training ausblenden
    setHTML("training", "");

  } else {

    // ✅ Turnier ausblenden
    setHTML("groups", "");
    setHTML("bracket", "");

    renderBoards(trainingMatches);
    renderTraining(trainingMatches);
  }
}


// ==========================
// ✅ HELPER
// ==========================
function setHTML(id, html){
  const el = document.getElementById(id);
  if(el) el.innerHTML = html;
}


// =======================
// 🟦 TRAINING VIEW
// =======================
function renderTraining(matches){

  const div = document.getElementById("training");
  if(!div) return;

  const active = matches.filter(m => m.fields.Status === "active");

  const finished = matches
    .filter(m => m.fields.Status === "finished")
    .slice(-5);

  let html = "<h2>🎯 Aktuelle Spiele</h2>";

  if(active.length === 0){
    html += "<p>Keine aktiven Spiele</p>";
  }

  active.forEach(m => {
    const f = m.fields;

    html += `
      <div class="card">
        ${f.Player1} vs ${f.Player2}<br>
        ${f.Score1} : ${f.Score2}
      </div>
    `;
  });

  html += "<h2>📈 Letzte Spiele</h2>";

  finished.forEach(m => {
    const f = m.fields;

    html += `
      <div class="card small">
        ${f.Player1} vs ${f.Player2}<br>
        Gewinner: ${f.Winner || "-"}
      </div>
    `;
  });

  div.innerHTML = html;
}


// =======================
// 🟩 BOARDS (bleibt gleich)
// =======================
function renderBoards(matches){

  const div = document.getElementById("boards");

  let html = "";

  const boards = [...new Set(
    matches
      .map(m => m.fields.BoardId)
      .filter(b => b !== null && b !== "" && b !== undefined)
  )];

  boards.sort((a,b) => Number(a) - Number(b));

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
// 🟪 GROUPS
// =======================
function renderGroups(matches){

  const div = document.getElementById("groups");

  let groups = {};

  matches.forEach(m => {

    const f = m.fields;

    if(f.Round !== "group" || !f.Group) return;

    if(!groups[f.Group]){
      groups[f.Group] = {};
    }

    if(!groups[f.Group][f.Player1]){
      groups[f.Group][f.Player1] = createStats(f.Player1);
    }

    if(!groups[f.Group][f.Player2]){
      groups[f.Group][f.Player2] = createStats(f.Player2);
    }

    if(f.Status === "finished"){

      const p1 = groups[f.Group][f.Player1];
      const p2 = groups[f.Group][f.Player2];

      p1.played++;
      p2.played++;

      p1.legsFor += f.Legs1 || 0;
      p1.legsAgainst += f.Legs2 || 0;

      p2.legsFor += f.Legs2 || 0;
      p2.legsAgainst += f.Legs1 || 0;

      if(f.Winner){
        groups[f.Group][f.Winner].wins++;
        groups[f.Group][f.Winner].points += 2;
      }
    }
  });

  let html = "";

  Object.keys(groups).sort().forEach(group => {

    let players = Object.values(groups[group]);

    players.forEach(p => {
      p.diff = p.legsFor - p.legsAgainst;
      p.avg = p.played > 0 ? (p.legsFor * 501) / (p.played * 15) : 0;
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


// =======================
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
// 🏆 BRACKET
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
function label(r){

  if(r==="last16") return "Achtelfinale";
  if(r==="quarter") return "Viertelfinale";
  if(r==="semi") return "Halbfinale";
  if(r==="final") return "Finale";

  return r;
}
