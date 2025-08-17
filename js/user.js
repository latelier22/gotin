// ===== Auth header (index.html) — version corrigée (utilise ?path=... au lieu de ?endpoint=...) =====
const API_PROXY   = "api-proxy.php";
const $status     = document.getElementById('auth-status');
const $btnLogin   = document.getElementById('btn-login');
const $btnLogout  = document.getElementById('btn-logout');
const $btnAccount = document.getElementById('btn-account');

let customerId = null;

function setAuthState(token, id){
  if(token){
    localStorage.setItem('jwt', token);
    localStorage.setItem('customerId', id);
    customerId = id;
    $status.textContent   = "Connecté";
    $btnLogin.style.display   = 'none';
    $btnLogout.style.display  = '';
    $btnAccount.style.display = '';
  } else {
    localStorage.removeItem('jwt');
    localStorage.removeItem('customerId');
    customerId = null;
    $status.textContent   = "Non connecté";
    $btnLogin.style.display   = '';
    $btnLogout.style.display  = 'none';
    $btnAccount.style.display = 'none';
  }
}

// utilitaire fetch via proxy
async function proxyFetch(path, opts = {}){
  const url = `${API_PROXY}?path=${encodeURIComponent(path)}${opts.query ? `&${opts.query}` : ''}`;
  const headers = Object.assign(
    { accept: 'application/json' },
    (opts.headers || {})
  );
  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if(!res.ok){
    const text = await res.text().catch(()=> '');
    throw new Error(`HTTP ${res.status} — ${text || 'Erreur'}`);
  }
  const ctype = res.headers.get('content-type') || '';
  return ctype.includes('application/json') ? res.json() : res.text();
}

// Login
$btnLogin.addEventListener('click', async () => {
  const email = prompt("Email :", "shop@example.com");
  const password = prompt("Mot de passe :", "sylius");
  if(!email || !password) return;

  try{
    const data = await proxyFetch('/shop/authentication-token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: { email, password }
    });
    if(!data.token || !data.customer) throw new Error('Réponse inattendue (token ou customer manquant).');
    const id = String(data.customer).split('/').pop(); // ex: "/api/v2/shop/customers/10" -> "10"
    setAuthState(data.token, id);
    alert("Connexion réussie !");
  }catch(e){
    console.error(e);
    alert("Échec de connexion : " + e.message);
  }
});

// Logout
$btnLogout.addEventListener('click', () => {
  setAuthState(null, null);
  alert('Déconnecté.');
});



// Initialisation
(function(){
  const token = localStorage.getItem('jwt');
  const id    = localStorage.getItem('customerId');
  setAuthState(token, id);
})();


// Helpers modale
const $accModal   = document.getElementById('account-modal');
const $accClose   = document.getElementById('account-close');
const $accError   = document.getElementById('account-error');
const setTxt = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };

function openAccountModal(){ $accModal.style.display = 'flex'; }
function closeAccountModal(){ $accModal.style.display = 'none'; }
$accClose.addEventListener('click', closeAccountModal);
$accModal.addEventListener('click', (e)=>{ if(e.target === $accModal) closeAccountModal(); });

// REMPLACE le click “Mon compte”
$btnAccount.addEventListener('click', async () => {
  const token = localStorage.getItem('jwt');
  const id = localStorage.getItem('customerId');
  if(!token || !id) return alert("Non connecté");

  // Reset UI
  $accError.style.display = 'none';
  setTxt('acc-email','—'); setTxt('acc-name','—'); setTxt('acc-gender','—');
  setTxt('acc-news','—');  setTxt('acc-verified','—'); setTxt('acc-address','—');
  openAccountModal();

  try{
    const me = await proxyFetch(`/shop/customers/${id}`, {
      headers: { authorization: `Bearer ${token}` }
    });

    // Exemple payload fourni :
    // {"email":"shop@example.com","firstName":"sylius","lastName":"shop","gender":"m","subscribedToNewsletter":true,"user":{"verified":true},"defaultAddress":null,"fullName":"sylius shop"}
    setTxt('acc-email', me.email || '—');
    setTxt('acc-name',  me.fullName || [me.firstName, me.lastName].filter(Boolean).join(' ') || '—');
    setTxt('acc-gender', (me.gender==='m'?'Homme':me.gender==='f'?'Femme':'—'));
    setTxt('acc-news',   me.subscribedToNewsletter ? 'Oui' : 'Non');
    setTxt('acc-verified', me.user && me.user.verified ? 'Oui' : 'Non');
    setTxt('acc-address', me.defaultAddress ? JSON.stringify(me.defaultAddress) : '—');
  }catch(e){
    console.error(e);
    $accError.textContent = "Erreur: " + e.message;
    $accError.style.display = '';
  }
});
