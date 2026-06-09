// ⚠️ Bitte hier Client ID und Tenant ID einsetzen

const msalConfig={auth:{clientId:"f52a25f2-e683-4bea-ae0f-6206e05a9b60",authority:"https://login.microsoftonline.com/d05e1986-9d0f-4d67-8b0d-990eb3ae4ecd",redirectUri:window.location.origin+"/darts-app/"}};
const msalInstance=new msal.PublicClientApplication(msalConfig);
async function init(){await msalInstance.handleRedirectPromise();}
async function login(){await init();const a=msalInstance.getAllAccounts();if(a.length===0){await msalInstance.loginRedirect({scopes:["User.Read","Sites.ReadWrite.All"]});}}
async function getToken(){await init();const a=msalInstance.getAllAccounts();const r=await msalInstance.acquireTokenSilent({scopes:["User.Read","Sites.ReadWrite.All"],account:a[0]});return r.accessToken;}
