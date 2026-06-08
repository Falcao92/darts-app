const msalConfig={auth:{clientId:"f52a25f2-e683-4bea-ae0f-6206e05a9b60",authority:"https://login.microsoftonline.com/d05e1986-9d0f-4d67-8b0d-990eb3ae4ecd",redirectUri:window.location.origin}};
const msalInstance=new msal.PublicClientApplication(msalConfig);
let accessToken=null;
async function login(){const result=await msalInstance.loginPopup({scopes:["User.Read","Sites.ReadWrite.All"]});accessToken=result.accessToken;}