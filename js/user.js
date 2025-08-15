
const API_PROXY = "api-proxy.php";
const $status = document.getElementById('auth-status');
const $btnLogin = document.getElementById('btn-login');
const $btnLogout = document.getElementById('btn-logout');
const $btnAccount = document.getElementById('btn-account');

let customerId = null;

function setAuthState(token, id){
  if(token){
    localStorage.setItem('jwt', token);
    localStorage.setItem('customerId', id);
    customerId = id;
    $status.textContent = "Connecté";
    $btnLogin.style.display = 'none';
    $btnLogout.style.display = '';
    $btnAccount.style.display = '';
  } else {
    localStorage.removeItem('jwt');
    localStorage.removeItem('customerId');
    customerId = null;
    $status.textContent = "Non connecté";
    $btnLogin.style.display = '';
    $btnLogout.style.display = 'none';
    $btnAccount.style.display = 'none';
  }
}

// Login
$btnLogin.addEventListener('click', async () => {
  const email = prompt("Email :", "shop@example.com");
  const password = prompt("Mot de passe :", "sylius");
  if(!email || !password) return;

  const res = await fetch(API_PROXY + "?endpoint=/shop/authentication-token", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ email, password })
  });

  if(!res.ok) return alert("Échec de connexion !");
  const data = await res.json();
  if(data.token){
    const id = data.customer.replace("/api/v2/shop/customers/", "");
    setAuthState(data.token, id);
    alert("Connexion réussie !");
  }
});

// Logout
$btnLogout.addEventListener('click', () => {
  setAuthState(null, null);
});

// Mon compte
$btnAccount.addEventListener('click', async () => {
  const token = localStorage.getItem('jwt');
  const id = localStorage.getItem('customerId');
  if(!token || !id) return alert("Non connecté");

  const res = await fetch(API_PROXY + "?endpoint=/shop/customers/" + id, {
    headers: { "Authorization": "Bearer " + token }
  });

  if(!res.ok) return alert("Erreur de récupération du compte");
  const data = await res.json();
  alert("Votre compte :\n" + JSON.stringify(data, null, 2));
});

// Initialisation
(function(){
  const token = localStorage.getItem('jwt');
  const id = localStorage.getItem('customerId');
  setAuthState(token, id);
})();

