const API = {
  token: null,
  setToken(t){ this.token = t; localStorage.setItem('jwt', t); },
  getToken(){ return this.token || localStorage.getItem('jwt'); },
  headers(){ return this.getToken() ? { 'Authorization': 'Bearer ' + this.getToken(), 'Content-Type':'application/json' } : { 'Content-Type':'application/json' }; },
  async login(email, password){
    const r = await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    if(!r.ok) throw new Error('Login failed');
    const j = await r.json(); this.setToken(j.token); return j;
  },
  async me(){ const r = await fetch('/api/auth/me',{headers:this.headers()}); return r.ok ? r.json(): null; },
  async list(q=''){ const url = '/api/watches' + (q?`?q=${encodeURIComponent(q)}`:''); const r = await fetch(url); return r.json(); },
  async create(data){ const r = await fetch('/api/watches',{method:'POST',headers:this.headers(),body:JSON.stringify(data)}); return r.json();},
  async update(id, data){ const r = await fetch('/api/watches/'+id,{method:'PUT',headers:this.headers(),body:JSON.stringify(data)}); return r.json();},
  async remove(id){ const r = await fetch('/api/watches/'+id,{method:'DELETE',headers:this.headers()}); return r.json();},
  async adjustStock(payload){ const r = await fetch('/api/stocks/adjust',{method:'POST',headers:this.headers(),body:JSON.stringify(payload)}); return r.json();},
};
