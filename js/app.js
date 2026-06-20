const API_URL = 'https://670ed5b73e7151861655eaa3.mockapi.io/Stagiaire';

// ── SESSION STORAGE ──────────────────────────────────
const Session = {
  set: (user) => sessionStorage.setItem('currentUser', JSON.stringify(user)),
  get: () => { const u = sessionStorage.getItem('currentUser'); return u ? JSON.parse(u) : null; },
  clear: () => sessionStorage.removeItem('currentUser'),
  update: (patch) => { const u = Session.get(); if (u) Session.set({ ...u, ...patch }); }
};

// ── REMEMBER ME ──────────────────────────────────────
const Remember = {
  save: (pseudo, pwd) => localStorage.setItem('rememberMe', JSON.stringify({ pseudo, pwd })),
  get: () => { const r = localStorage.getItem('rememberMe'); return r ? JSON.parse(r) : null; },
  clear: () => localStorage.removeItem('rememberMe')
};

// ── ROUTER ───────────────────────────────────────────
const Router = {
  go(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');
  }
};

// ── API SERVICE ───────────────────────────────────────
const API = {
  getAll: () => fetch(API_URL).then(r => r.json()),
  getOne: (id) => fetch(`${API_URL}/${id}`).then(r => r.json()),
  create: (data) => fetch(API_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  update: (id, data) => fetch(`${API_URL}/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  delete: (id) => fetch(`${API_URL}/${id}`, { method: 'DELETE' }).then(r => r.json())
};

// ── VALIDATION ────────────────────────────────────────
const Validate = {
  password(pwd) {
    return [
      { key: 'upper',   label: 'Majuscule',        met: /[A-Z]/.test(pwd) },
      { key: 'lower',   label: 'Minuscule',         met: /[a-z]/.test(pwd) },
      { key: 'digit',   label: 'Chiffre',           met: /[0-9]/.test(pwd) },
      { key: 'special', label: 'Caractère spécial', met: /[^A-Za-z0-9]/.test(pwd) },
      { key: 'length',  label: '8 caractères min',  met: pwd.length >= 8 }
    ];
  },
  isPasswordValid(pwd) { return this.password(pwd).every(r => r.met); }
};

// ── LOGIN ─────────────────────────────────────────────
let loginAttempts = 0;

function initLogin() {
  const form      = document.getElementById('login-form');
  const errorList = document.getElementById('login-errors');
  const btnLogin  = document.getElementById('btn-login');
  const rememberChk = document.getElementById('remember-me');

  // Pré-remplir si "Se rappeler de moi"
  const saved = Remember.get();
  if (saved) {
    document.getElementById('login-pseudo').value = saved.pseudo;
    document.getElementById('login-pwd').value    = saved.pwd;
    rememberChk.checked = true;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorList.innerHTML = '';

    if (loginAttempts >= 3) return;

    const pseudo = document.getElementById('login-pseudo').value.trim();
    const pwd    = document.getElementById('login-pwd').value.trim();
    const errors = [];

    if (!pseudo) errors.push('Le nom d\'utilisateur est obligatoire.');
    if (!pwd)    errors.push('Le mot de passe est obligatoire.');
    if (errors.length) { showErrors(errorList, errors); return; }

    btnLogin.disabled = true;
    btnLogin.textContent = 'Connexion…';

    try {
      const users = await API.getAll();

      // ─── CORRECTION : comparaison insensible aux espaces + multi-champ ───
      const input = pseudo.trim().toLowerCase();
      const user = users.find(u => {
        const matchPseudo = u.pseudo && u.pseudo.trim().toLowerCase() === input;
        const matchEmail  = u.email  && u.email.trim().toLowerCase()  === input;
        const matchPwd    = u.MotDePasse && u.MotDePasse.trim() === pwd.trim();
        return (matchPseudo || matchEmail) && matchPwd;
      });

      if (user) {
        loginAttempts = 0;
        Session.set(user);
        if (rememberChk.checked) Remember.save(pseudo, pwd);
        else Remember.clear();
        loadLayout();
        Router.go('app-layout');
      } else {
        loginAttempts++;
        if (loginAttempts >= 3) {
          btnLogin.disabled = true;
          btnLogin.textContent = 'BLOQUÉ (3 tentatives)';
          showErrors(errorList, ['❌ Trop de tentatives. Bouton désactivé.']);
          return;
        }
        showErrors(errorList, [`❌ Identifiants incorrects. Tentative ${loginAttempts}/3.`]);
        btnLogin.disabled = false;
        btnLogin.textContent = 'LOGIN';
      }
    } catch (err) {
      showErrors(errorList, ['⚠️ Erreur réseau. Vérifiez votre connexion.']);
      btnLogin.disabled = false;
      btnLogin.textContent = 'LOGIN';
    }
  });
}

// ── CREATE ACCOUNT ────────────────────────────────────
function initCreateAccount() {
  const form      = document.getElementById('create-form');
  const errorList = document.getElementById('create-errors');
  const pwdInput  = document.getElementById('ca-pwd');

  pwdInput.addEventListener('input', () => {
    Validate.password(pwdInput.value).forEach(r => {
      const el = document.getElementById('req-' + r.key);
      if (el) el.classList.toggle('met', r.met);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorList.innerHTML = '';
    const errors = [];

    const nom    = document.getElementById('ca-nom').value.trim();
    const prenom = document.getElementById('ca-prenom').value.trim();
    const age    = document.getElementById('ca-age').value.trim();
    const pseudo = document.getElementById('ca-pseudo').value.trim();
    const email  = document.getElementById('ca-email').value.trim();
    const pays   = document.getElementById('ca-pays').value.trim();
    const devise = document.getElementById('ca-devise').value.trim();
    const couleur= document.getElementById('ca-couleur').value.trim();
    const pwd    = document.getElementById('ca-pwd').value;
    const pwdC   = document.getElementById('ca-pwd-confirm').value;
    const adminV = document.getElementById('ca-admin').value;

    if (!nom)    errors.push('Le champ Nom est obligatoire.');
    if (!prenom) errors.push('Le champ Prénom est obligatoire.');
    if (!age)    errors.push('Le champ Âge est obligatoire.');
    if (!pseudo) errors.push('Le champ Pseudo est obligatoire.');
    if (!email)  errors.push('Le champ Email est obligatoire.');
    if (!pays)   errors.push('Le champ Pays est obligatoire.');
    if (!devise) errors.push('Le champ Devise est obligatoire.');
    if (!couleur)errors.push('Le champ Couleur est obligatoire.');
    if (!pwd)    errors.push('Le mot de passe est obligatoire.');
    else if (!Validate.isPasswordValid(pwd)) errors.push('Le mot de passe ne respecte pas les critères de sécurité.');
    if (pwd !== pwdC) errors.push('Les mots de passe ne correspondent pas.');

    if (errors.length) { showErrors(errorList, errors); return; }

    const btn = document.getElementById('btn-create');
    btn.disabled = true; btn.textContent = 'Création en cours…';

    try {
      await API.create({
        nom, prenom, age, pseudo, email,
        Pays: pays, Devise: devise, couleur,
        MotDePasse: pwd,
        admin: adminV === 'true',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${pseudo}`,
        photo: `https://loremflickr.com/640/480/people`
      });
      alert('✅ Compte créé avec succès ! Redirection vers la connexion…');
      Router.go('login-page');
    } catch {
      showErrors(errorList, ['❌ Erreur lors de la création. Réessayez.']);
    }
    btn.disabled = false; btn.textContent = 'Créer le compte';
  });
}

// ── LAYOUT ────────────────────────────────────────────
function loadLayout() {
  const user = Session.get();
  if (!user) { Router.go('login-page'); return; }

  document.getElementById('header-username').textContent = `${user.prenom} ${user.nom}`;

  const menus = [
    { id: 'Accueil',            label: '🏠 Accueil',             admin: true,  visitor: true  },
    { id: 'VoirMonProfile',     label: '👤 Mon Profil',          admin: true,  visitor: true  },
    { id: 'ModifierCouleur',    label: '🎨 Couleur',             admin: true,  visitor: true  },
    { id: 'ListeUtilisateurs',  label: '👥 Utilisateurs',        admin: true,  visitor: false },
    { id: 'AjouterUtilisateur', label: '➕ Ajouter',             admin: true,  visitor: false },
    { id: 'MesDemandes',        label: '📋 Mes Demandes',        admin: false, visitor: true  },
    { id: 'GererDemandes',      label: '⚙️ Gérer Demandes',     admin: true,  visitor: false },
  ];

  const visible = menus.filter(m => user.admin ? m.admin : m.visitor);

  document.getElementById('app-navbar').innerHTML = visible.map(m =>
    `<span class="nav-link" onclick="showContent('${m.id}')">${m.label}</span>`
  ).join('');

  document.getElementById('app-sidebar').innerHTML = `
    <div style="padding:16px 24px 8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:.5;font-weight:600">Navigation</div>
    ${visible.map(m =>
      `<div class="sidebar-link" onclick="showContent('${m.id}')">
        <span>${m.label}</span>
      </div>`
    ).join('')}
  `;

  showContent('Accueil');
}

// ── ROUTING CONTENU ───────────────────────────────────
function showContent(pageId) {
  document.querySelectorAll('.nav-link, .sidebar-link').forEach(el => el.classList.remove('active'));
  document.querySelectorAll(`[onclick="showContent('${pageId}')"]`).forEach(el => el.classList.add('active'));
  const content = document.getElementById('app-content');
  const map = {
    'Accueil':            renderAccueil,
    'VoirMonProfile':     renderProfile,
    'ModifierCouleur':    renderModifierCouleur,
    'ListeUtilisateurs':  renderListeUtilisateurs,
    'AjouterUtilisateur': renderAjouterUtilisateur,
    'MesDemandes':        renderMesDemandes,
    'GererDemandes':      renderGererDemandes,
  };
  if (map[pageId]) map[pageId](content);
}

// ── PAGES ─────────────────────────────────────────────
function renderAccueil(el) {
  const u = Session.get();
  el.innerHTML = `
    <div class="card" style="max-width:600px">
      <h2 style="margin-bottom:8px">👋 Bienvenue, ${u.prenom} ${u.nom} !</h2>
      <p style="color:var(--text-muted);margin-bottom:20px">
        Connecté en tant que <strong>${u.admin ? '🔑 Administrateur' : '👁 Visiteur'}</strong>
      </p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <div class="card" style="padding:18px;flex:1;min-width:130px;background:#f0f9ff;box-shadow:none">
          <div style="font-size:26px">👤</div>
          <div style="font-weight:600;margin-top:6px">${u.pseudo}</div>
          <div style="font-size:12px;color:var(--text-muted)">Pseudo</div>
        </div>
        <div class="card" style="padding:18px;flex:1;min-width:130px;background:#f0fdf4;box-shadow:none">
          <div style="font-size:26px">🌍</div>
          <div style="font-weight:600;margin-top:6px">${u.Pays || '–'}</div>
          <div style="font-size:12px;color:var(--text-muted)">Pays</div>
        </div>
        <div class="card" style="padding:18px;flex:1;min-width:130px;background:#fff7ed;box-shadow:none">
          <div style="font-size:26px">🎨</div>
          <div style="font-weight:600;margin-top:6px">${u.couleur || '–'}</div>
          <div style="font-size:12px;color:var(--text-muted)">Couleur</div>
        </div>
      </div>
    </div>`;
}

function renderProfile(el) {
  const u = Session.get();
  const fields = [
    ['Prénom', u.prenom], ['Nom', u.nom], ['Âge', u.age], ['Email', u.email],
    ['Pseudo', u.pseudo], ['Pays', u.Pays], ['Devise', u.Devise], ['Couleur', u.couleur],
    ['Rôle', u.admin ? 'Administrateur ✅' : 'Visiteur'], ['ID', u.id]
  ];
  el.innerHTML = `
    <div class="card">
      <div class="profile-header">
        <img src="${u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.pseudo}`}"
             class="avatar avatar-lg" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=x'">
        <div>
          <h2>${u.prenom} ${u.nom}</h2>
          <p style="color:var(--text-muted);font-size:14px">${u.email}</p>
          <span class="badge ${u.admin ? 'badge-success' : 'badge-warning'}">${u.admin ? 'Admin' : 'Visiteur'}</span>
        </div>
      </div>
      <div class="profile-fields">
        ${fields.map(([l,v]) => `
          <div class="profile-field">
            <div class="label">${l}</div>
            <div class="value">${v || '–'}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

function renderModifierCouleur(el) {
  const user = Session.get();
  if (!user.admin && parseInt(user.age) < 15) {
    el.innerHTML = `<div class="card" style="max-width:480px">
      <h2>🎨 Modifier la couleur</h2>
      <p style="margin-top:16px;color:var(--text-muted)">⚠️ Réservé aux utilisateurs de 15 ans et plus.</p>
    </div>`; return;
  }
  const colors = ['red','blue','green','purple','orange','maroon','teal','navy','pink','black','gold','coral','#00b4d8','#e74c3c','#2ecc71'];
  el.innerHTML = `
    <div class="card" style="max-width:480px">
      <h2 style="margin-bottom:20px">🎨 Modifier la couleur préférée</h2>
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
        <span id="color-preview" style="width:48px;height:48px;border-radius:50%;border:3px solid #e2e8f0;display:inline-block;background:${user.couleur}"></span>
        <strong id="color-label">${user.couleur}</strong>
      </div>
      <div class="form-group">
        <label>Nouvelle couleur</label>
        <select class="form-control" id="color-select">
          ${colors.map(c => `<option value="${c}" ${c===user.couleur?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div id="color-msg" style="margin:10px 0"></div>
      <button class="btn btn-primary" onclick="saveColor()">✔ Valider</button>
    </div>`;
  document.getElementById('color-select').addEventListener('change', e => {
    document.getElementById('color-preview').style.background = e.target.value;
    document.getElementById('color-label').textContent = e.target.value;
  });
}

async function saveColor() {
  const user  = Session.get();
  const color = document.getElementById('color-select').value;
  const msg   = document.getElementById('color-msg');
  msg.innerHTML = '<em>Sauvegarde…</em>';
  try {
    await API.update(user.id, { couleur: color });
    Session.update({ couleur: color });
    msg.innerHTML = `<span style="color:var(--success)">✅ Couleur mise à jour : <strong>${color}</strong></span>`;
  } catch {
    msg.innerHTML = '<span style="color:var(--danger)">❌ Erreur.</span>';
  }
}

async function renderListeUtilisateurs(el) {
  el.innerHTML = '<p>Chargement…</p>';
  try {
    const users = await API.getAll();
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h2>👥 Liste des Utilisateurs (${users.length})</h2>
        <button class="btn btn-primary btn-sm" onclick="showContent('AjouterUtilisateur')">➕ Ajouter</button>
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Avatar</th><th>Nom</th><th>Prénom</th><th>Pseudo</th><th>Email</th><th>Admin</th><th>Actions</th></tr></thead>
            <tbody>
              ${users.map(u => `<tr>
                <td><img src="${u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.pseudo}" class="avatar" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=x'"></td>
                <td><strong>${u.nom}</strong></td>
                <td>${u.prenom}</td>
                <td>${u.pseudo}</td>
                <td style="font-size:12px">${u.email}</td>
                <td><span class="badge ${u.admin ? 'badge-success':'badge-warning'}">${u.admin?'Admin':'Visiteur'}</span></td>
                <td><div class="table-actions">
                  <button class="btn btn-outline btn-sm" onclick="renderDetailsUser('${u.id}')">👁</button>
                  <button class="btn btn-primary btn-sm" onclick="renderEditUser('${u.id}')">✏️</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')">🗑</button>
                </div></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch { el.innerHTML = '<p style="color:var(--danger)">❌ Erreur de chargement.</p>'; }
}

async function renderDetailsUser(id) {
  const el = document.getElementById('app-content');
  el.innerHTML = '<p>Chargement…</p>';
  const u = await API.getOne(id);
  el.innerHTML = `
    <button class="btn btn-outline btn-sm" onclick="showContent('ListeUtilisateurs')" style="margin-bottom:16px">← Retour</button>
    <div class="card" style="max-width:500px">
      <div class="profile-header">
        <img src="${u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.pseudo}" class="avatar avatar-lg" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=x'">
        <div><h2>${u.prenom} ${u.nom}</h2><p style="color:var(--text-muted)">${u.email}</p></div>
      </div>
      <div class="profile-fields">
        ${[['Pseudo',u.pseudo],['Âge',u.age],['Pays',u.Pays],['Couleur',u.couleur],['Admin',u.admin?'Oui':'Non']].map(([l,v])=>
          `<div class="profile-field"><div class="label">${l}</div><div class="value">${v||'–'}</div></div>`).join('')}
      </div>
    </div>`;
}

async function renderEditUser(id) {
  const el = document.getElementById('app-content');
  el.innerHTML = '<p>Chargement…</p>';
  const u = await API.getOne(id);
  el.innerHTML = `
    <button class="btn btn-outline btn-sm" onclick="showContent('ListeUtilisateurs')" style="margin-bottom:16px">← Retour</button>
    <div class="card" style="max-width:480px">
      <h2 style="margin-bottom:20px">✏️ Modifier l'utilisateur</h2>
      <div class="form-group"><label>Nom</label><input class="form-control" id="edit-nom" value="${u.nom}"></div>
      <div class="form-group"><label>Prénom</label><input class="form-control" id="edit-prenom" value="${u.prenom}"></div>
      <div class="form-group"><label>Âge</label><input class="form-control" type="number" id="edit-age" value="${u.age}"></div>
      <div class="form-group"><label>Email</label><input class="form-control" id="edit-email" value="${u.email}"></div>
      <div class="form-group"><label>Pays</label><input class="form-control" id="edit-pays" value="${u.Pays||''}"></div>
      <div id="edit-msg"></div>
      <button class="btn btn-primary" onclick="saveEditUser('${u.id}')">💾 Enregistrer</button>
    </div>`;
}

async function saveEditUser(id) {
  const msg = document.getElementById('edit-msg');
  try {
    await API.update(id, {
      nom:    document.getElementById('edit-nom').value,
      prenom: document.getElementById('edit-prenom').value,
      age:    document.getElementById('edit-age').value,
      email:  document.getElementById('edit-email').value,
      Pays:   document.getElementById('edit-pays').value
    });
    msg.innerHTML = '<span style="color:var(--success)">✅ Modifié avec succès !</span>';
  } catch { msg.innerHTML = '<span style="color:var(--danger)">❌ Erreur.</span>'; }
}

async function deleteUser(id) {
  if (!confirm('Supprimer cet utilisateur ?')) return;
  try {
    await API.delete(id);
    renderListeUtilisateurs(document.getElementById('app-content'));
  } catch { alert('Erreur lors de la suppression.'); }
}

function renderAjouterUtilisateur(el) {
  el.innerHTML = `
    <div class="card" style="max-width:560px">
      <h2 style="margin-bottom:20px">➕ Ajouter un Utilisateur</h2>
      <div class="form-row">
        <div class="form-group"><label>Nom</label><input class="form-control" id="add-nom"></div>
        <div class="form-group"><label>Prénom</label><input class="form-control" id="add-prenom"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Âge</label><input class="form-control" type="number" id="add-age"></div>
        <div class="form-group"><label>Pseudo</label><input class="form-control" id="add-pseudo"></div>
      </div>
      <div class="form-group"><label>Email</label><input class="form-control" type="email" id="add-email"></div>
      <div class="form-group"><label>Mot de passe</label><input class="form-control" type="password" id="add-pwd"></div>
      <div class="form-row">
        <div class="form-group"><label>Pays</label><input class="form-control" id="add-pays"></div>
        <div class="form-group"><label>Devise</label><input class="form-control" id="add-devise"></div>
      </div>
      <div class="form-group">
        <label>Rôle</label>
        <select class="form-control" id="add-admin">
          <option value="false">Visiteur</option>
          <option value="true">Admin</option>
        </select>
      </div>
      <div id="add-msg"></div>
      <button class="btn btn-primary" id="btn-add-user" onclick="submitAddUser()">➕ Ajouter</button>
    </div>`;
}

async function submitAddUser() {
  const msg = document.getElementById('add-msg');
  const pseudo = document.getElementById('add-pseudo').value.trim();
  const data = {
    nom:    document.getElementById('add-nom').value.trim(),
    prenom: document.getElementById('add-prenom').value.trim(),
    age:    document.getElementById('add-age').value,
    pseudo, email: document.getElementById('add-email').value.trim(),
    MotDePasse: document.getElementById('add-pwd').value,
    Pays:   document.getElementById('add-pays').value.trim(),
    Devise: document.getElementById('add-devise').value.trim(),
    admin:  document.getElementById('add-admin').value === 'true',
    couleur:'blue',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${pseudo}`
  };
  if (!data.nom||!data.prenom||!pseudo||!data.email) {
    msg.innerHTML = '<span style="color:var(--danger)">❌ Champs obligatoires manquants.</span>'; return;
  }
  try {
    document.getElementById('btn-add-user').disabled = true;
    await API.create(data);
    msg.innerHTML = '<span style="color:var(--success)">✅ Utilisateur ajouté !</span>';
    document.getElementById('btn-add-user').disabled = false;
  } catch { msg.innerHTML = '<span style="color:var(--danger)">❌ Erreur.</span>'; }
}

// ── DEMANDES ──────────────────────────────────────────
function getDemandes() {
  const user = Session.get();
  return getAllDemandes().filter(d => d.userId === user.id);
}
function getAllDemandes() { return JSON.parse(localStorage.getItem('demandes') || '[]'); }
function saveDemandes(all) { localStorage.setItem('demandes', JSON.stringify(all)); }

function renderMesDemandes(el) {
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2>📋 Mes Demandes</h2>
      <button class="btn btn-primary btn-sm" onclick="toggleAddDemande()">➕ Nouvelle</button>
    </div>
    <div id="add-dem-form" style="display:none" class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:14px">Nouvelle demande</h3>
      <div class="form-group"><label>Titre</label><input class="form-control" id="dem-titre" placeholder="Titre"></div>
      <div class="form-group"><label>Description</label><textarea class="form-control" id="dem-desc" rows="3"></textarea></div>
      <div id="dem-msg"></div>
      <button class="btn btn-primary" onclick="submitDemande()">Envoyer</button>
    </div>
    <div class="demande-tabs">
      ${[['all','Toutes'],['pending','En attente'],['approved','Approuvées'],['rejected','Rejetées']].map(([k,l])=>
        `<div class="demande-tab ${k==='all'?'active':''}" id="dtab-${k}" onclick="filterDemandes('${k}')">${l}</div>`).join('')}
    </div>
    <div id="demandes-list"></div>`;
  filterDemandes('all');
}

function toggleAddDemande() {
  const f = document.getElementById('add-dem-form');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

function submitDemande() {
  const titre = document.getElementById('dem-titre').value.trim();
  const desc  = document.getElementById('dem-desc').value.trim();
  const msg   = document.getElementById('dem-msg');
  if (!titre||!desc) { msg.innerHTML='<span style="color:var(--danger)">Titre et description obligatoires.</span>'; return; }
  const user = Session.get();
  const all = getAllDemandes();
  all.push({ id: Date.now(), userId: user.id, titre, description: desc, statut: 'pending', date: new Date().toLocaleDateString('fr-FR') });
  saveDemandes(all);
  msg.innerHTML = '<span style="color:var(--success)">✅ Demande envoyée !</span>';
  document.getElementById('dem-titre').value = '';
  document.getElementById('dem-desc').value = '';
  filterDemandes('all');
}

function filterDemandes(filter) {
  document.querySelectorAll('[id^="dtab-"]').forEach(t => t.classList.remove('active'));
  document.getElementById('dtab-' + filter)?.classList.add('active');
  const list = document.getElementById('demandes-list');
  const badge  = { pending:'badge-warning', approved:'badge-success', rejected:'badge-danger' };
  const labels = { pending:'⏳ En attente', approved:'✅ Approuvée', rejected:'❌ Rejetée' };
  const items  = getDemandes().filter(d => filter === 'all' || d.statut === filter);
  if (!items.length) { list.innerHTML = '<p style="color:var(--text-muted);margin-top:12px">Aucune demande.</p>'; return; }
  list.innerHTML = items.map(d => `
    <div class="card" style="margin-top:10px;display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <strong>${d.titre}</strong> <span class="badge ${badge[d.statut]}" style="margin-left:8px">${labels[d.statut]}</span>
        <p style="color:var(--text-muted);font-size:13px;margin-top:4px">${d.description}</p>
        <small style="color:var(--text-muted)">${d.date}</small>
      </div>
      ${d.statut==='pending'?`<button class="btn btn-danger btn-sm" onclick="cancelDemande(${d.id})">Annuler</button>`:''}
    </div>`).join('');
}

function cancelDemande(id) {
  if (!confirm('Annuler cette demande ?')) return;
  saveDemandes(getAllDemandes().filter(d => d.id !== id));
  filterDemandes('all');
}

function renderGererDemandes(el) {
  el.innerHTML = `
    <h2 style="margin-bottom:16px">⚙️ Gérer les Demandes</h2>
    <div class="demande-tabs">
      ${[['all','Toutes'],['pending','En attente'],['approved','Approuvées'],['rejected','Rejetées']].map(([k,l])=>
        `<div class="demande-tab ${k==='pending'?'active':''}" id="adtab-${k}" onclick="filterAdminDemandes('${k}')">${l}</div>`).join('')}
    </div>
    <div id="admin-demandes-list"></div>`;
  filterAdminDemandes('pending');
}

function filterAdminDemandes(filter) {
  document.querySelectorAll('[id^="adtab-"]').forEach(t => t.classList.remove('active'));
  document.getElementById('adtab-' + filter)?.classList.add('active');
  const badge  = { pending:'badge-warning', approved:'badge-success', rejected:'badge-danger' };
  const labels = { pending:'⏳ En attente', approved:'✅ Approuvée', rejected:'❌ Rejetée' };
  const items  = getAllDemandes().filter(d => filter === 'all' || d.statut === filter);
  const list   = document.getElementById('admin-demandes-list');
  if (!items.length) { list.innerHTML = '<p style="color:var(--text-muted);margin-top:12px">Aucune demande.</p>'; return; }
  list.innerHTML = items.map(d => `
    <div class="card" style="margin-top:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div>
          <strong>${d.titre}</strong> <span class="badge ${badge[d.statut]}" style="margin-left:8px">${labels[d.statut]}</span>
          <p style="color:var(--text-muted);font-size:13px;margin:4px 0">${d.description}</p>
          <small style="color:var(--text-muted)">User ID: ${d.userId} — ${d.date}</small>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-success btn-sm" onclick="setDemandeStatus(${d.id},'approved')">✅</button>
          <button class="btn btn-danger btn-sm" onclick="setDemandeStatus(${d.id},'rejected')">❌</button>
        </div>
      </div>
    </div>`).join('');
}

function setDemandeStatus(id, statut) {
  saveDemandes(getAllDemandes().map(d => d.id === id ? { ...d, statut } : d));
  filterAdminDemandes(document.querySelector('[id^="adtab-"].active')?.id.replace('adtab-','') || 'pending');
}

// ── DÉCONNEXION ───────────────────────────────────────
function logout() {
  Session.clear();
  loginAttempts = 0;
  document.getElementById('btn-login').disabled = false;
  document.getElementById('btn-login').textContent = 'LOGIN';
  Router.go('login-page');
}

// ── UTILITAIRE ────────────────────────────────────────
function showErrors(ulEl, errors) {
  ulEl.innerHTML = errors.map(e => `<li>${e}</li>`).join('');
}

// ── INIT ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  initCreateAccount();
  if (Session.get()) { loadLayout(); Router.go('app-layout'); }
  else Router.go('login-page');
});
