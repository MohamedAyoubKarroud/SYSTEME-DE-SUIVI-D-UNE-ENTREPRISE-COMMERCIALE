# SSEC — Système de suivi d'entreprise commerciale
Système pour gérer l'intrégralité des points importants dans une entreprise commerciale tels que l'inventaire, les tâches affectées aux divers employés ainsi que des graphiques pour visualiser clairement les performances globales

## Membres de l'équipe
Mohamed Ayoub - Scrum Master : Développement Backend + Bases de données

Saad - Product Owner : Documentation

Faris - Développeur : Développement Frontend

Mohamed Ayman - Développeur : Implémentation des APIs

## Layout

```
SSEC
├─ backend
│  ├─ api
│  │  ├─ auth
│  │  │  └─ login.php
│  │  └─ employees
│  │     └─ list.php
│  ├─ config
│  │  ├─ config.php
│  │  └─ database.php
│  ├─ helpers
│  │  ├─ auth_middleware.php
│  │  ├─ http.php
│  │  └─ jwt.php
│  └─ sql
│     └─ schema.sql
├─ frontend
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ src
│  │  ├─ api
│  │  │  └─ client.js
│  │  ├─ App.jsx
│  │  ├─ components
│  │  │  ├─ Chart.jsx
│  │  │  ├─ DashboardLayout.jsx
│  │  │  ├─ DataTable.jsx
│  │  │  ├─ icons.jsx
│  │  │  ├─ Sidebar.jsx
│  │  │  ├─ Skeleton.jsx
│  │  │  ├─ StatCard.jsx
│  │  │  ├─ StatusBadge.jsx
│  │  │  └─ Toast.jsx
│  │  ├─ context
│  │  │  └─ AuthContext.jsx
│  │  ├─ main.jsx
│  │  ├─ pages
│  │  │  ├─ DashboardAdmin.jsx
│  │  │  ├─ DashboardDirection.jsx
│  │  │  ├─ DashboardEmploye.jsx
│  │  │  ├─ Landing.css
│  │  │  ├─ Landing.jsx
│  │  │  ├─ Login.jsx
│  │  │  └─ NotFound.jsx
│  │  ├─ router
│  │  │  ├─ AppRouter.jsx
│  │  │  └─ ProtectedRoute.jsx
│  │  └─ styles
│  │     └─ global.css
│  └─ vite.config.js
└─ README.md
├─ docs
    ├─ fiche_projet - SSEC.pdf
    ├─ 1_SSEC_S2.pdf
    └─ Livrable_3_1.pdf
└─ .gitignore
```
## Technologies utilisées

Languages: HTML, CSS, JavaScript, REACT, PHP, MySQL

APIS: chart.js, SendGrid, JWT, Auth0, REST API

## Prérequis d'installation

Node (ver 18+)

## Instructions de lancement

### Backend setup

```bash
# 1. Créer le schéma
mysql -u root -p < backend/sql/schema.sql

# 2. Configurer l'environnement
cp backend/.env.example backend/.env
# edit DB_*, set a strong JWT_SECRET, set FRONTEND_ORIGIN

# 3. Serveur
php -S localhost:8000 -t backend
```

Seed un admin (passwords stockés avec `password_hash`):

```sql
INSERT INTO employee (nom, prenom, email, password, role)
VALUES ('Admin', 'Root', 'admin@ssec.local',
        '$2y$10$REPLACE_WITH_password_hash_OUTPUT', 'admin_it');
```

Générer le hash: `php -r "echo password_hash('your_pwd', PASSWORD_BCRYPT);"`

### Frontend setup

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173, /api proxied to :8000
```

## Roles → routes

| Role       | Landing path | Sidebar links                                |
|------------|-------------|----------------------------------------------|
| `direction`| `/direction`| Vue d'ensemble · Performance · Employés      |
| `employe`  | `/employe`  | Mes tâches · Commandes · Clients             |
| `admin_it` | `/admin`    | Vue système · Utilisateurs · Journaux        |

`ProtectedRoute` redirige les utilisateurs non authentifiés vers `/login` et les rôles non autorisés vers `/`.

## URL de déploiement



## Identifiants de test



## Livrables antérieurs 




