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

  matches.forEach(m => {

    const f = m.fields;

    // ✅ NUR Gruppenspiele
    if(!f.Group || f.Round !== "group") return;

    if(!groups[f.Group]){
      groups[f.Group] = new Set();
    }

    groups[f.Group].add(f.Player1);
    groups[f.Group].add(f.Player2);
  });

  let html = "";

  Object.keys(groups).sort().forEach(g => {

    html += `
      <div class="group">
        <b>Gruppe ${g}</b><br>
        ${[...groups[g]].join("<br>")}
      </div>
    `;
  });

  div.innerHTML = html;
}
