const SITE_ID="tsc1907.sharepoint.com,d96117e0-7254-4552-960e-8c95ddcd448a,47f5cfc3-5363-450c-94ce-296234c476af";
async function getMatches(){const res=await fetch(`https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items?expand=fields`,{headers:{Authorization:`Bearer ${accessToken}`}});return (await res.json()).value;}
async function updateMatch(id, score1, score2) {
  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items/${id}/fields`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        Score1: score1,
        Score2: score2
      })
    }
  );

  console.log("✅ Match aktualisiert");
}
