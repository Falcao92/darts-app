
window.onload=async()=>{await login();loadPlayers();}

async function loadPlayers(){const data=await getList('Players');document.getElementById('players').innerHTML=data.map(p=>p.fields.Title).join('<br>');}

async function createPlayer(){const t=await getToken();const n=document.getElementById('name').value;
await fetch(`https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Players/items`,{method:'POST',headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{Title:n}})});
loadPlayers();}
