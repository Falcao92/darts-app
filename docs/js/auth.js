const msalConfig = {
  auth: {
    clientId: "f52a25f2-e683-4bea-ae0f-6206e05a9b60",
    authority: "https://login.microsoftonline.com/d05e1986-9d0f-4d67-8b0d-990eb3ae4ecd",
    redirectUri: window.location.origin + "/darts-app/"
  }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

let accessToken = null;

async function login() {

const currentUrl = window.location.href;
sessionStorage.setItem("redirectAfterLogin", currentUrl);

  const accounts = msalInstance.getAllAccounts();

  if (accounts.length > 0) {
    const result = await msalInstance.acquireTokenSilent({
      scopes: ["User.Read", "Sites.ReadWrite.All"],
      account: accounts[0]
    });

    accessToken = result.accessToken;
    return;
  }

  await msalInstance.loginRedirect({
    scopes: ["User.Read", "Sites.ReadWrite.All"]
  });
}

msalInstance.handleRedirectPromise().then(async (result) => {
  if (result && result.account) {

    const tokenResponse = await msalInstance.acquireTokenSilent({
      scopes: ["User.Read", "Sites.ReadWrite.All"],
      account: result.account
    });

    accessToken = tokenResponse.accessToken;

    // 🔥 Zurück zur ursprünglichen Seite
const redirectUrl = sessionStorage.getItem("redirectAfterLogin");

if (redirectUrl && window.location.href !== redirectUrl) {
  window.location.href = redirectUrl;
}
  }
});

