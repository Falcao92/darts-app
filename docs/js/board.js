
window.onload=async()=>{await login();load();}
async function load(){const m=await getList('Matches');document.getElementById('data').innerText=JSON.stringify(m,null,2);} 
