
window.onload=async()=>{await login();const m=await getList('Matches');document.getElementById('out').innerText=JSON.stringify(m,null,2);} 
