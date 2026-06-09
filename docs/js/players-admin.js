async function createPlayer() {

  // ❌ REMOVE ensureLogin()

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
