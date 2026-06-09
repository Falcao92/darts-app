// ⚠️ Bitte hier Client ID und Tenant ID einsetzen

const SITE_ID="tsc1907.sharepoint.com,d96117e0-7254-4552-960e-8c95ddcd448a,47f5cfc3-5363-450c-94ce-296234c476af";
async function getList(name){const t=await getToken();const r=await fetch(`https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${name}/items?expand=fields`,{headers:{Authorization:`Bearer ${t}`}});return (await r.json()).value;}
