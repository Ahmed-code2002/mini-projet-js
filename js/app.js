// ═══════════════════════════════════════════
//  CONFIGURATION
// ═══════════════════════════════════════════
const API_URL = 'https://670ed5b73e7151861655eaa3.mockapi.io/Stagiaire';

// ═══════════════════════════════════════════
//  SESSION STORAGE  (stockage côté client)
//  Explication : sessionStorage garde les données
//  le temps de la session (onglet ouvert). Fermé
//  l'onglet → données effacées automatiquement.
// ═══════════════════════════════════════════
const Session = {
  set: (user) => sessionStorage.setItem('currentUser', JSON.stringify(user)),
  get: () => { const u = sessionStorage.getItem('currentUser'); return u ? JSON.parse(u) : null; },
  clear: () => sessionStorage.removeItem('currentUser'),
  update: (patch) => {
    const u = Session.get();
    if (u) Session.set({ ...u, ...patch });
  }
};

// ═══════════════════════════════════════════
//  REMEMBER ME  (localStorage persiste après fermeture)
// ═══════════════════════════════════════════
const Remember = {
  save: (pseudo, pwd) => localStorage.setItem('rememberMe', JSON.stringify({ pseudo, pwd })),
  get: () => { const r = localStorage.getItem('rememberMe'); return r ? JSON.parse(r) : null; },
  clear: () => localStorage.removeItem('rememberMe')
};

// ═══════════════════════════════════════════
//  ROUTER  – affiche/cache les "pages"
//  Explication : On simule un router SPA en
//  montrant/cachant des sections HTML.
// ═══════════════════════════════════════════
const Router = {
  go(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');
  }
};

// ═══════════════════════════════════════════
//  API SERVICE  – fetch wrapper
//  Explication : Chaque fonction correspond à
//  une opération CRUD via fetch().
// ═══════════════════════════════════════════
const API = {
  getAll: () => fetch(API_URL).then(r => r.json()),
  getOne: (id) => fetch(`${API_URL}/${id}`).then(r => r.json()),
  create: (data) => fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  update: (id, data) => fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  delete: (id) => fetch(`${API_URL}/${id}`, { method: 'DELETE' }).then(r => r.json())
};

// ═══════════════════════════════════════════
//  VALIDATION UTILITAIRES
// ═══════════════════════════════════════════
const Validate = {
  password(pwd) {
    const rules = [
      { key: 'upper',   label: 'Majuscule',        test: /[A-Z]/ },
      { key: 'lower',   label: 'Minuscule',         test: /[a-z]/ },
      { key: 'digit',   label: 'Chiffre',           test: /[0-9]/ },
      { key: 'special', label: 'Caractère spécial', test: /[^A-Za-z0-9]/ },
      { key: 'length',  label: '8 caractères min',  test: /.{8,}/ }
    ];
    return rules.map(r => ({ ...r, met: r.test.test(pwd) }));
  },
  isPasswordValid(pwd) {
    return this.password(pwd).every(r => r.met);
  }
};

// ═══════════════════════════════════════════
//  PAGE : LOGIN
// ═══════════════════════════════════════════
let loginAttempts = 0;

function initLogin() {
  const form      = document.getElementById('login-form');
  const errorList = document.getElementById('login-errors');
  const btnLogin  = document.getElementById('btn-login');
  const rememberChk = document.getElementById('remember-me');

  // Pré-remplir si "Se rappeler de moi" activé
  const saved = Remember.get();
  if (saved) {
    document.getElementById('login-pseudo').value = saved.pseudo;
    document.getElementById('login-pwd').value    = saved.pwd;
    rememberChk.checked = true;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorList.innerHTML = '';

    const pseudo = document.getElementById('login-pseudo').value.trim();
    const pwd    = document.getElementById('login-pwd').value;
    const errors = [];

    // Validation côté client
    if (!pseudo) errors.push('Le nom d\'utilisateur est obligatoire.');
    if (!pwd)    errors.push('Le mot de passe est obligatoire.');
    if (errors.length) { showErrors(errorList, errors); return; }

    btnLogin.disabled = true;
    btnLogin.textContent = 'Connexion…';

    try {
      // Fetch vers l'API pour vérifier l'utilisateur
      const users = await API.getAll();
      // On cherche par pseudo OU email
      const user = users.find(u =>
        (u.pseudo === pseudo || u.email === pseudo) && u.MotDePasse === pwd
      );

      if (user) {
        loginAttempts = 0;
        // Sauvegarder dans sessionStorage
        Session.set(user);
        // Remember Me
        if (rememberChk.checked) Remember.save(pseudo, pwd);
        else Remember.clear();
        // Charger le layout
        loadLayout();
        Router.go('app-layout');
      } else {
        loginAttempts++;
        if (loginAttempts >= 3) {
          btnLogin.disabled = true;
          btnLogin.textContent = 'BLOQUÉ (3 tentatives)';
          showErrors(errorList, ['Trop de tentatives échouées. Bouton désactivé.']);
          return;
        }
        showErrors(errorList, [`Identifiants incorrects. Tentative ${loginAttempts}/3.`]);
      }
    } catch (err) {
      showErrors(errorList, ['Erreur réseau. Réessayez.']);
    }

    if (loginAttempts < 3) {
      btnLogin.disabled = false;
      btnLogin.textContent = 'LOGIN';
    }
  });
}

// ═══════════════════════════════════════════
//  PAGE : CREATE ACCOUNT
// ═══════════════════════════════════════════
function initCreateAccount() {
  const form      = document.getElementById('create-form');
  const errorList = document.getElementById('create-errors');
  const pwdInput  = document.getElementById('ca-pwd');

  // Indicateurs de force du mot de passe (en temps réel)
  pwdInput.addEventListener('input', () => {
    const rules = Validate.password(pwdInput.value);
    rules.forEach(r => {
      const el = document.getElementById('req-' + r.key);
      if (el) el.classList.toggle('met', r.met);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorList.innerHTML = '';
    const errors = [];

    const fields = ['ca-nom', 'ca-prenom', 'ca-age', 'ca-pseudo', 'ca-email', 'ca-pays', 'ca-devise', 'ca-couleur'];
    const data = {};
    fields.forEach(id => {
      const val = document.getElementById(id).value.trim();
      if (!val) errors.push(`Le champ "${id.replace('ca-', '')}" est obligatoire.`);
      data[id.replace('ca-', '')] = val;
    });

    const pwd     = document.getElementById('ca-pwd').value;
    const pwdConf = document.getElementById('ca-pwd-confirm').value;
    const adminV  = document.getElementById('ca-admin').value;

    if (!pwd) errors.push('Le mot de passe est obligatoire.');
    else if (!Validate.isPasswordValid(pwd)) errors.push('Le mot de passe ne respecte pas les critères.');
    if (pwd !== pwdConf) errors.push('Les mots de passe ne correspondent pas.');

    if (errors.length) { showErrors(errorList, errors); return; }

    const newUser = {
      nom: data.nom, prenom: data.prenom, age: data.age,
      pseudo: data.pseudo, email: data.email,
      Pays: data.pays, Devise: data.devise, couleur: data.couleur,
      MotDePasse: pwd,
      admin: adminV === 'true',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.pseudo}`,
      photo: `https://loremflickr.com/640/480/people?random=${Date.now()}`
    };

    try {
      const btn = document.getElementById('btn-create');
      btn.disabled = true; btn.textContent = 'Création…';
      await API.create(newUser);
      alert('✅ Compte créé ! Vous allez être redirigé vers la connexion.');
      Router.go('login-page');
      btn.disabled = false; btn.textContent = 'Créer le compte';
    } catch (err) {
      showErrors(errorList, ['Erreur lors de la création. Réessayez.']);
    }
  });
}

// ═══════════════════════════════════════════
//  LAYOUT : Header + Nav + Sidebar + Footer
// ═══════════════════════════════════════════
function loadLayout() {
  const user = Session.get();
  if (!user) { Router.go('login-page'); return; }

  // Couleur de fond depuis le stockage client
  document.documentElement.style.setProperty('--user-color', user.couleur || '#00b4d8');
  document.getElementById('app-layout').style.backgroundColor = '';

  // Header : nom + prénom
  document.getElementById('header-username').textContent = `${user.prenom} ${user.nom}`;

  // Construire les menus selon admin ou visiteur
  const menus = [
    { id: 'Accueil',           label: '🏠 Accueil',             admin: true,  visitor: true  },
    { id: 'VoirMonProfile',    label: '👤 Mon Profil',          admin: true,  visitor: true  },
    { id: 'ModifierCouleur',   label: '🎨 Couleur',             admin: true,  visitor: true  },
    { id: 'ListeUtilisateurs', label: '👥 Liste Utilisateurs',  admin: true,  visitor: false },
    { id: 'AjouterUtilisateur',label: '➕ Ajouter Utilisateur', admin: true,  visitor: false },
    { id: 'MesDemandes',       label: '📋 Mes Demandes',        admin: false, visitor: true  },
    { id: 'GererDemandes',     label: '⚙️ Gérer Demandes',     admin: true,  visitor: false },
  ];

  const visible = menus.filter(m => user.admin ? m.admin : m.visitor);

  // NavBar horizontale
  const navbar = document.getElementById('app-navbar');
  navbar.innerHTML = visible.map(m =>
    `<span class="nav-link" onclick="showContent('${m.id}')">${m.label}</span>`
  ).join('');

  // Sidebar verticale
  const sidebar = document.getElementById('app-sidebar');
  sidebar.innerHTML = `
    <div style="padding:16px 24px 8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:.5;font-weight:600">Navigation</div>
    ${visible.map(m =>
      `<div class="sidebar-link" onclick="showContent('${m.id}')">
        <span class="icon">${m.label.split(' ')[0]}</span>
        <span>${m.label.split(' ').slice(1).join(' ')}</span>
      </div>`
    ).join('')}
  `;

  // Page d'accueil par défaut
  showContent('Accueil');
}

// ═══════════════════════════════════════════
//  ROUTING DES CONTENUS
// ═══════════════════════════════════════════
function showContent(pageId) {
  // Activer le lien cliqué
  document.querySelectorAll('.nav-link, .sidebar-link').forEach(el => el.classList.remove('active'));
  document.querySelectorAll(`[onclick="showContent('${pageId}')"]`).forEach(el => el.classList.add('active'));

  const content = document.getElementById('app-content');
  switch (pageId) {
    case 'Accueil':           renderAccueil(content);            break;
    case 'VoirMonProfile':    renderProfile(content);            break;
    case 'ModifierCouleur':   renderModifierCouleur(content);    break;
    case 'ListeUtilisateurs': renderListeUtilisateurs(content);  break;
    case 'AjouterUtilisateur':renderAjouterUtilisateur(content); break;
    case 'MesDemandes':       renderMesDemandes(content);        break;
    case 'GererDemandes':     renderGererDemandes(content);      break;
  }
}

// ═══════════════════════════════════════════
//  CONTENU : ACCUEIL
// ═══════════════════════════════════════════
function renderAccueil(el) {
  const user = Session.get();
  el.innerHTML = `
    <div class="card" style="max-width:600px">
      <h2 style="margin-bottom:8px">👋 Bienvenue, ${user.prenom} ${user.nom} !</h2>
      <p style="color:var(--text-muted);margin-bottom:20px">
        Vous êtes connecté en tant que <strong>${user.admin ? 'Administrateur' : 'Visiteur'}</strong>.
      </p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <div class="card" style="padding:18px;flex:1;min-width:140px;background:#f0f9ff;box-shadow:none">
          <div style="font-size:28px">👤</div>
          <div style="font-weight:600;margin-top:6px">${user.pseudo}</div>
          <div style="font-size:12px;color:var(--text-muted)">Pseudo</div>
        </div>
        <div class="card" style="padding:18px;flex:1;min-width:140px;background:#f0fdf4;box-shadow:none">
          <div style="font-size:28px">🌍</div>
          <div style="font-weight:600;margin-top:6px">${user.Pays || '–'}</div>
          <div style="font-size:12px;color:var(--text-muted)">Pays</div>
        </div>
        <div class="card" style="padding:18px;flex:1;min-width:140px;background:#fff7ed;box-shadow:none">
          <div style="font-size:28px">🎨</div>
          <div style="font-weight:600;margin-top:6px">${user.couleur || '–'}</div>
          <div style="font-size:12px;color:var(--text-muted)">Couleur préférée</div>
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════
//  CONTENU : VOIR MON PROFILE
// ═══════════════════════════════════════════
function renderProfile(el) {
  const u = Session.get();
  const fields = [
    ['Prénom',   u.prenom], ['Nom',      u.nom],
    ['Âge',      u.age],    ['Email',    u.email],
    ['Pseudo',   u.pseudo], ['Pays',     u.Pays],
    ['Devise',   u.Devise], ['Couleur',  u.couleur],
    ['Admin',    u.admin ? 'Oui ✅' : 'Non ❌'], ['ID', u.id]
  ];
  el.innerHTML = `
    <div class="card">
      <div class="profile-header">
        <img src="${u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.pseudo}"
             class="avatar avatar-lg" alt="avatar" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=default'">
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
          </div>
        `).join('')}
      </div>
      ${u.photo ? `<img src="${u.photo}" style="margin-top:20px;border-radius:10px;width:100%;max-height:180px;object-fit:cover" onerror="this.style.display='none'">` : ''}
    </div>
  `;
}

// ═══════════════════════════════════════════
//  CONTENU : MODIFIER COULEUR
// ═══════════════════════════════════════════
function renderModifierCouleur(el) {
  const user = Session.get();

  // Règle : visiteur de moins de 15 ans → message
  if (!user.admin && parseInt(user.age) < 15) {
    el.innerHTML = `
      <div class="card" style="max-width:480px">
        <h2>🎨 Modifier la couleur</h2>
        <p style="margin-top:16px;color:var(--text-muted)">
          ⚠️ Cette fonctionnalité est réservée aux utilisateurs de 15 ans et plus.
        </p>
      </div>`;
    return;
  }

  const colors = ['red','blue','green','purple','orange','maroon','teal','navy','pink','black','gold','coral'];
  el.innerHTML = `
    <div class="card" style="max-width:480px">
      <h2 style="margin-bottom:20px">🎨 Modifier la couleur préférée</h2>
      <p style="color:var(--text-muted);margin-bottom:16px">Couleur actuelle :</p>
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
        <span class="color-preview" id="color-preview" style="background:${user.couleur}"></span>
        <strong id="color-label">${user.couleur}</strong>
      </div>
      <div class="form-group">
        <label>Choisir une nouvelle couleur</label>
        <select class="form-control" id="color-select">
          ${colors.map(c => `<option value="${c}" ${c===user.couleur?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div id="color-msg" style="margin-top:10px"></div>
      <button class="btn btn-primary" onclick="saveColor()" style="margin-top:8px">✔ Valider</button>
    </div>
  `;

  document.getElementById('color-select').addEventListener('change', (e) => {
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
    document.documentElement.style.setProperty('--user-color', color);
    msg.innerHTML = `<span style="color:var(--success)">✅ Couleur mise à jour : <strong>${color}</strong></span>`;
    document.getElementById('color-preview').style.background = color;
  } catch {
    msg.innerHTML = '<span style="color:var(--danger)">❌ Erreur lors de la mise à jour.</span>';
  }
}

// ═══════════════════════════════════════════
//  CONTENU : LISTE UTILISATEURS (Admin)
// ═══════════════════════════════════════════
async function renderListeUtilisateurs(el) {
  el.innerHTML = '<p>Chargement…</p>';
  try {
    const users = await API.getAll();
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h2>👥 Liste des Utilisateurs</h2>
        <button class="btn btn-primary btn-sm" onclick="showContent('AjouterUtilisateur')">➕ Ajouter</button>
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Avatar</th><th>Nom</th><th>Prénom</th><th>Email</th>
              <th>Pays</th><th>Admin</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td><img src="${u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.pseudo}" class="avatar" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=x'"></td>
                  <td><strong>${u.nom}</strong></td>
                  <td>${u.prenom}</td>
                  <td>${u.email}</td>
                  <td>${u.Pays || '–'}</td>
                  <td><span class="badge ${u.admin ? 'badge-success' : 'badge-warning'}">${u.admin ? 'Admin' : 'Visiteur'}</span></td>
                  <td>
                    <div class="table-actions">
                      <button class="btn btn-outline btn-sm" onclick="renderDetailsUser(${u.id})">👁</button>
                      <button class="btn btn-primary btn-sm" onclick="renderEditUser(${u.id})">✏️</button>
                      <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})">🗑</button>
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch {
    el.innerHTML = '<p style="color:var(--danger)">Erreur de chargement.</p>';
  }
}

async function renderDetailsUser(id) {
  const content = document.getElementById('app-content');
  content.innerHTML = '<p>Chargement…</p>';
  const u = await API.getOne(id);
  content.innerHTML = `
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
  const content = document.getElementById('app-content');
  content.innerHTML = '<p>Chargement…</p>';
  const u = await API.getOne(id);
  content.innerHTML = `
    <button class="btn btn-outline btn-sm" onclick="showContent('ListeUtilisateurs')" style="margin-bottom:16px">← Retour</button>
    <div class="card" style="max-width:480px">
      <h2 style="margin-bottom:20px">✏️ Modifier l'utilisateur</h2>
      <div class="form-group"><label>Nom</label><input class="form-control" id="edit-nom" value="${u.nom}"></div>
      <div class="form-group"><label>Prénom</label><input class="form-control" id="edit-prenom" value="${u.prenom}"></div>
      <div class="form-group"><label>Âge</label><input class="form-control" type="number" id="edit-age" value="${u.age}"></div>
      <div class="form-group"><label>Email</label><input class="form-control" id="edit-email" value="${u.email}"></div>
      <div class="form-group"><label>Pays</label><input class="form-control" id="edit-pays" value="${u.Pays||''}"></div>
      <div id="edit-msg"></div>
      <button class="btn btn-primary" onclick="saveEditUser(${u.id})">💾 Enregistrer</button>
    </div>`;
}

async function saveEditUser(id) {
  const msg = document.getElementById('edit-msg');
  const data = {
    nom:    document.getElementById('edit-nom').value,
    prenom: document.getElementById('edit-prenom').value,
    age:    document.getElementById('edit-age').value,
    email:  document.getElementById('edit-email').value,
    Pays:   document.getElementById('edit-pays').value
  };
  try {
    await API.update(id, data);
    msg.innerHTML = '<span style="color:var(--success)">✅ Modifié avec succès !</span>';
  } catch {
    msg.innerHTML = '<span style="color:var(--danger)">❌ Erreur.</span>';
  }
}

async function deleteUser(id) {
  if (!confirm('Confirmer la suppression ?')) return;
  try {
    await API.delete(id);
    renderListeUtilisateurs(document.getElementById('app-content'));
  } catch {
    alert('Erreur lors de la suppression.');
  }
}

// ═══════════════════════════════════════════
//  CONTENU : AJOUTER UTILISATEUR (Admin)
// ═══════════════════════════════════════════
function renderAjouterUtilisateur(el) {
  el.innerHTML = `
    <div class="card" style="max-width:560px">
      <h2 style="margin-bottom:20px">➕ Ajouter un Utilisateur</h2>
      <div class="form-row">
        <div class="form-group"><label>Nom</label><input class="form-control" id="add-nom" placeholder="Nom"></div>
        <div class="form-group"><label>Prénom</label><input class="form-control" id="add-prenom" placeholder="Prénom"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Âge</label><input class="form-control" type="number" id="add-age"></div>
        <div class="form-group"><label>Pseudo</label><input class="form-control" id="add-pseudo"></div>
      </div>
      <div class="form-group"><label>Email</label><input class="form-control" id="add-email" type="email"></div>
      <div class="form-group"><label>Mot de passe</label><input class="form-control" id="add-pwd" type="password"></div>
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
  const nom    = document.getElementById('add-nom').value.trim();
  const prenom = document.getElementById('add-prenom').value.trim();
  const pseudo = document.getElementById('add-pseudo').value.trim();
  const email  = document.getElementById('add-email').value.trim();
  const pwd    = document.getElementById('add-pwd').value;
  if (!nom||!prenom||!pseudo||!email||!pwd) {
    msg.innerHTML = '<span style="color:var(--danger)">❌ Tous les champs sont obligatoires.</span>';
    return;
  }
  const user = {
    nom, prenom, pseudo, email, MotDePasse: pwd,
    age:   document.getElementById('add-age').value,
    Pays:  document.getElementById('add-pays').value,
    Devise:document.getElementById('add-devise').value,
    admin: document.getElementById('add-admin').value === 'true',
    couleur: 'blue',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${pseudo}`
  };
  try {
    document.getElementById('btn-add-user').disabled = true;
    await API.create(user);
    msg.innerHTML = '<span style="color:var(--success)">✅ Utilisateur ajouté !</span>';
    document.getElementById('btn-add-user').disabled = false;
  } catch {
    msg.innerHTML = '<span style="color:var(--danger)">❌ Erreur lors de l\'ajout.</span>';
  }
}

// ═══════════════════════════════════════════
//  CONTENU : MES DEMANDES (Visiteur)
//  Stockage local simulé via localStorage
// ═══════════════════════════════════════════
function getDemandes() {
  const user = Session.get();
  const all = JSON.parse(localStorage.getItem('demandes') || '[]');
  return all.filter(d => d.userId === user.id);
}
function getAllDemandes() { return JSON.parse(localStorage.getItem('demandes') || '[]'); }
function saveDemandes(all) { localStorage.setItem('demandes', JSON.stringify(all)); }

function renderMesDemandes(el) {
  const user = Session.get();
  const tabs = ['all','pending','approved','rejected'];
  const labels = { all:'Toutes', pending:'En attente', approved:'Approuvées', rejected:'Rejetées' };

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2>📋 Mes Demandes</h2>
      <button class="btn btn-primary btn-sm" onclick="showAddDemande()">➕ Nouvelle demande</button>
    </div>
    <div id="add-demande-form" style="display:none" class="card" style="max-width:500px;margin-bottom:20px">
      <h3 style="margin-bottom:14px">Nouvelle demande</h3>
      <div class="form-group"><label>Titre</label><input class="form-control" id="dem-titre" placeholder="Titre de la demande"></div>
      <div class="form-group"><label>Description</label><textarea class="form-control" id="dem-desc" rows="3" placeholder="Description…"></textarea></div>
      <div id="dem-msg"></div>
      <button class="btn btn-primary" onclick="submitDemande()">Envoyer</button>
    </div>
    <div class="demande-tabs">
      ${tabs.map(t => `<div class="demande-tab ${t==='all'?'active':''}" id="dtab-${t}" onclick="filterDemandes('${t}')">${labels[t]}</div>`).join('')}
    </div>
    <div id="demandes-list"></div>`;

  filterDemandes('all');
}

function showAddDemande() {
  const f = document.getElementById('add-demande-form');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

function submitDemande() {
  const titre = document.getElementById('dem-titre').value.trim();
  const desc  = document.getElementById('dem-desc').value.trim();
  const msg   = document.getElementById('dem-msg');
  if (!titre || !desc) { msg.innerHTML = '<span style="color:var(--danger)">Titre et description obligatoires.</span>'; return; }
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
  document.querySelectorAll('.demande-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('dtab-' + filter)?.classList.add('active');
  const demandes = getDemandes().filter(d => filter === 'all' || d.statut === filter);
  const labels = { pending:'⏳ En attente', approved:'✅ Approuvée', rejected:'❌ Rejetée' };
  const badge  = { pending:'badge-warning', approved:'badge-success', rejected:'badge-danger' };
  const list   = document.getElementById('demandes-list');
  if (!demandes.length) { list.innerHTML = '<p style="color:var(--text-muted);margin-top:12px">Aucune demande.</p>'; return; }
  list.innerHTML = demandes.map(d => `
    <div class="card" style="margin-top:10px;display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <strong>${d.titre}</strong> <span class="badge ${badge[d.statut]}" style="margin-left:8px">${labels[d.statut]}</span>
        <p style="color:var(--text-muted);font-size:13px;margin-top:4px">${d.description}</p>
        <small style="color:var(--text-muted)">${d.date}</small>
      </div>
      ${d.statut === 'pending' ? `<button class="btn btn-danger btn-sm" onclick="cancelDemande(${d.id})">Annuler</button>` : ''}
    </div>`).join('');
}

function cancelDemande(id) {
  if (!confirm('Annuler cette demande ?')) return;
  const all = getAllDemandes().filter(d => d.id !== id);
  saveDemandes(all);
  filterDemandes('all');
}

// ═══════════════════════════════════════════
//  CONTENU : GÉRER DEMANDES (Admin)
// ═══════════════════════════════════════════
function renderGererDemandes(el) {
  const tabs = ['all','pending','approved','rejected'];
  const labels = { all:'Toutes', pending:'En attente', approved:'Approuvées', rejected:'Rejetées' };
  el.innerHTML = `
    <h2 style="margin-bottom:16px">⚙️ Gérer les Demandes</h2>
    <div class="demande-tabs">
      ${tabs.map(t => `<div class="demande-tab ${t==='pending'?'active':''}" id="adtab-${t}" onclick="filterAdminDemandes('${t}')">${labels[t]}</div>`).join('')}
    </div>
    <div id="admin-demandes-list"></div>`;
  filterAdminDemandes('pending');
}

function filterAdminDemandes(filter) {
  document.querySelectorAll('#admin-demandes-list').forEach(() => {});
  document.querySelectorAll('[id^="adtab-"]').forEach(t => t.classList.remove('active'));
  document.getElementById('adtab-' + filter)?.classList.add('active');
  const all = getAllDemandes().filter(d => filter === 'all' || d.statut === filter);
  const badge = { pending:'badge-warning', approved:'badge-success', rejected:'badge-danger' };
  const statusLabel = { pending:'⏳ En attente', approved:'✅ Approuvée', rejected:'❌ Rejetée' };
  const list = document.getElementById('admin-demandes-list');
  if (!all.length) { list.innerHTML = '<p style="color:var(--text-muted);margin-top:12px">Aucune demande.</p>'; return; }
  list.innerHTML = all.map(d => `
    <div class="card" style="margin-top:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <strong>${d.titre}</strong> <span class="badge ${badge[d.statut]}" style="margin-left:8px">${statusLabel[d.statut]}</span>
          <p style="color:var(--text-muted);font-size:13px;margin:4px 0">${d.description}</p>
          <small style="color:var(--text-muted)">Utilisateur ID: ${d.userId} — ${d.date}</small>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-success btn-sm" onclick="setDemandeStatus(${d.id},'approved')">✅ Approuver</button>
          <button class="btn btn-danger btn-sm" onclick="setDemandeStatus(${d.id},'rejected')">❌ Rejeter</button>
        </div>
      </div>
    </div>`).join('');
}

function setDemandeStatus(id, statut) {
  const all = getAllDemandes().map(d => d.id === id ? { ...d, statut } : d);
  saveDemandes(all);
  filterAdminDemandes('pending');
}

// ═══════════════════════════════════════════
//  DÉCONNEXION
// ═══════════════════════════════════════════
function logout() {
  Session.clear();
  loginAttempts = 0;
  Router.go('login-page');
}

// ═══════════════════════════════════════════
//  UTILITAIRE : afficher des erreurs (ul rouge)
// ═══════════════════════════════════════════
function showErrors(ulEl, errors) {
  ulEl.innerHTML = errors.map(e => `<li>${e}</li>`).join('');
}

// ═══════════════════════════════════════════
//  INITIALISATION AU CHARGEMENT
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  initCreateAccount();

  // Si déjà connecté → aller direct au layout
  if (Session.get()) {
    loadLayout();
    Router.go('app-layout');
  } else {
    Router.go('login-page');
  }
});
