
window.onload=async()=>{await login();loadPlayers();}

async function loadPlayers(){const data=await getList('Players');document.getElementById('players').innerHTML=data.map(p=>p.fields.Title).join('<br>');}

async function deletePlayer(id) {
  const t = await getToken();

  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Players/items/${id}`,
  {
    method:"DELETE",
    headers:{ Authorization:`Bearer ${t}` }
  });

  loadPlayers();
}

async function createTournament(){

  const players = (await getList("Players")).map(x=>x.fields.Title);

  for(let i=0;i<players.length;i+=2){

    await createMatch(players[i], players[i+1]||"Freilos", i+1);
  }
}

async function createMatch(p1,p2,board){

  const t = await getToken();

  await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Matches/items`,
  {
    method:"POST",
    headers:{
      Authorization:`Bearer ${t}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      fields:{
        Title:p1+" vs "+p2,
        Player1:p1,
        Player2:p2,
        Score1:501,
        Score2:501,
        BoardId:board,
        Turn:"p1"
      }
    })
  });
}

async function createPlayer(){const t=await getToken();const n=document.getElementById('name').value;
await fetch(`https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Players/items`,{method:'POST',headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{Title:n}})});
loadPlayers();}
