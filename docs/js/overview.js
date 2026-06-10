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
// 📺 BOARDS ALS KACHELN
// ===================================
function renderBoards(matches){

  const div = document.getElementById("boards");

  const boards = [...new Set(matches.map(m => m.fields.BoardId))];

  let html = "";

  boards.forEach(boardId => {

    // ✅ aktuelles Spiel
    const live = matches.find(m =>
      m.fields &&
      m.fields.BoardId == boardId &&
      m.fields.Status === "active"
    );

    // ✅ nächstes Spiel
    const next = matches.find(m =>
      m.fields &&
      m.fields.BoardId == boardId &&
      m.fields.Status !== "active" &&
      m.fields.Status !== "finished"
    );

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
      html += `<div>kein Spiel</div>`;
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
  });

  div.innerHTML = html;
}


// ===================================
// 🧩 GRUPPEN KOMPAKT
// ===================================
function renderGroups(matches){

  const div = document.getElementById("groups");

  let groups = {};

  matches.forEach(m => {

    const f = m.fields;

    if(f.Group){
      if(!groups[f.Group]) groups[f.Group] = [];
      groups[f.Group].push(f.Player1, f.Player2);
    }
  });

  let html = "";

  Object.keys(groups).forEach(g => {

    const players = [...new Set(groups[g])];

    html += `
      <div class="group">
        <b>Gruppe ${g}</b><br>
        ${players.join("<br>")}
      </div>
    `;
  });

  div.innerHTML = html;
}
