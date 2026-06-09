async function loadPlayers() {

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Players/items?expand=fields`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  const data = await res.json();
  const div = document.getElementById("players");

  div.innerHTML = "";

  data.value.forEach(p => {
    div.innerHTML += `
      <div style="margin-bottom:10px;">
        <b>${p.fields.Title}</b>
      </div>
    `;
  });
}

async function createPlayer() {
  await ensureLogin();

  const name = document.getElementById("name").value;

  if (!name) {
    alert("Bitte Name eingeben");
    return;
  }

  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Players/items`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fields: {
          Title: name
        }
      })
    }
  );

  document.getElementById("name").value = "";

  await loadPlayers();
}


// ✅ ✅ WICHTIG: Statt direktem Aufruf!
window.addEventListener("DOMContentLoaded", async () => {

  await ensureLogin();
  await loadPlayers();

});
