# Sécurité et exploitation de Sprintly

Les corrections du 19 novembre 2026 protègent les API de connexion, projets,
sprints et génération de comptes rendus. Aucun changement n’a été apporté à
la politique d’adhésion libre aux projets demandée pour l’équipe.

## Démarrage

Node.js 24 est requis. En local, utiliser `npm run dev`.
Pour préparer la production, exécuter `npm ci` puis `npm run build`.
`npm start` lance le serveur compilé, qui sert uniquement les fichiers de `dist`
et les API autorisées. `vite preview` reste un outil de prévisualisation.

Sur la machine de production, configurer les variables suivantes dans
l’environnement ou dans `.env.local`, avec ses droits restreints à l’utilisateur
qui exécute le service.

```dotenv
APP_ORIGIN=https://votre-domaine-interne.example
TRUST_PROXY=1
HOST=127.0.0.1
PORT=3000
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
```

Le proxy HTTPS doit transmettre le nom d’hôte public et
`X-Forwarded-Proto: https`. Il doit remplacer les valeurs fournies par le client.
Le port Node doit être accessible uniquement à ce proxy. Ne pas activer
`TRUST_PROXY=1` pour un serveur directement accessible aux clients.
Le serveur exige HTTPS, le nom d’hôte configuré et une origine identique pour
les mutations. L’adresse APP_ORIGIN ne doit contenir ni chemin ni slash final.
Le serveur ajoute CSP, HSTS et des protections contre les contenus mal typés,
les permissions matérielles inutiles et l’intégration dans un site tiers.

Le déploiement réel, le certificat, le pare-feu et les alertes restent à configurer
sur l’hébergement choisi. Aucun déploiement externe n’a été réalisé.

## Comptes et sessions

Les mots de passe sont hashés avec scrypt, un sel de 16 octets et les paramètres
N=131072, r=8, p=1. Les anciens hashes sont migrés à la connexion réussie,
sans remplacer le mot de passe de l’utilisateur. Le format versionné permet de
continuer à vérifier les comptes existants.

Les mots de passe temporaires expirent au bout de sept jours. Les temporaires
historiques reçoivent une échéance persistante lors du premier démarrage de la
nouvelle API. Le changement reste obligatoire avant l’accès aux données et à l’IA.
Le script de préparation conserve les mots de passe existants. Pour réémettre
uniquement les temporaires expirés, utiliser une destination privée inexistante.

```sh
node server/provision-passwords.mjs /chemin/prive/temporaires.txt --renew-expired
```

Transmettre chaque mot de passe à son destinataire puis supprimer le fichier de
remise après distribution selon la politique interne. Ne pas le versionner.
Le script ne réinitialise pas un mot de passe personnel.
La récupération d’un compte et la désactivation d’un collaborateur doivent
suivre une procédure administrateur. Aucun lien de récupération non vérifié
n’a été ajouté.

Les sessions sont stockées côté serveur sous forme de jetons hashés, communes
aux instances qui utilisent le même répertoire de données. Elles expirent après
12 heures, ou après deux heures d’inactivité. Un maximum de cinq sessions par
compte et 2000 sessions globales est appliqué. La déconnexion révoque le jeton.
Le changement de mot de passe invalide les autres sessions. Une première
reconnexion peut être nécessaire après la mise à jour de l’ancienne version.

Les limites sont persistantes et réservées avant le calcul du mot de passe.
Elles s’appliquent aussi aux requêtes simultanées et au changement du mot de passe.
Les connexions sont limitées à 10 tentatives par compte sur 15 minutes, avec des
plafonds supplémentaires par source et globaux. Deux calculs coûteux peuvent
s’exécuter simultanément. Les compteurs incluent les tentatives réussies.

## Données et récupération

Les nouveaux sprints et leur historique sont enregistrés côté serveur, par
compte, dans `.data/sprints`. La vérification de version refuse l’écrasement
d’un sprint modifié dans un autre onglet. Une erreur de sauvegarde est affichée
et permet de télécharger les modifications encore présentes dans la page.
Les nouvelles sauvegardes n’utilisent plus les clés localStorage communes.

Les anciennes clés locales `sprintly-data` et `sprintly-history` sont conservées.
Leur format ne permet pas d’identifier leur propriétaire. Elles ne sont donc pas
importées ni affichées automatiquement dans le nouveau stockage personnel.
Leur récupération exige d’identifier le propriétaire, d’exporter le contenu depuis
son navigateur puis de l’importer dans son compte. Ne pas les attribuer au premier
utilisateur connecté. Un ancien profil de navigateur partagé contient toujours
ces anciennes données. Après récupération, les retirer de ce profil selon la
politique de l’équipe.

Les écritures de comptes, projets et sprints utilisent des verrous partagés,
avec heartbeat et récupération des verrous abandonnés. Les remplacements des
fichiers sont atomiques. Toutes les instances doivent utiliser le même stockage
et les mêmes paramètres de verrouillage. Pour plusieurs machines indépendantes
ou une charge importante, migrer vers une base transactionnelle et un magasin
de sessions adaptés. Les tests couvrent plusieurs instances sur le même système
de fichiers, sans certification de tous les systèmes de fichiers réseau.

Des copies de récupération sont créées avant les changements. Elles sont gardées
au maximum 30 jours, 50 fichiers et environ 250 Mo par répertoire de sauvegarde.
Les plafonds sont contrôlés à chaque écriture. Les fichiers sont restreints et
ne sont jamais servis par le serveur de production. Les modifications des
projets sont limitées à 200 projets, 1000 documents par projet et 25 Mo au total.
Les sprints sont limités en taille et à 500 entrées d’historique par compte.

Les copies locales ne remplacent pas une sauvegarde externe chiffrée. Prévoir
une copie régulière de `.data`, un contrôle de restauration et une surveillance
du disque. Ne pas copier les fichiers temporaires de remise des mots de passe
dans les sauvegardes ordinaires.

Pour restaurer une copie locale, arrêter toutes les instances, sauvegarder le
stockage courant, valider le contenu de la copie puis remplacer le fichier
concerné avec des droits 600. Lors d’une restauration des comptes, retirer le
fichier `security.json` pour révoquer toutes les sessions. Redémarrer et vérifier
les droits et les documents récupérés. Cette procédure n’a pas été exécutée sur
les données réelles pendant les corrections.

## IA et traçabilité

La génération IA exige une session valide et un mot de passe définitif.
Les requêtes doivent avoir une origine autorisée et un contenu application/json.
Le quota est de 20 générations par utilisateur et 200 globalement par tranche
de 24 heures, avec deux générations simultanées au maximum. Les demandes admises
au quota sont comptées même si le fournisseur échoue ensuite.
Une durée maximale de 60 secondes et une limite de sortie sont appliquées.

Les événements de connexion, de changement de mot de passe, de génération et de
mutation des projets sont journalisés dans `.data/audit.jsonl`. Le compte y est
pseudonymisé. Les mots de passe, cookies, clés et notes n’y figurent pas. Rotation
à environ 5 Mo, avec un fichier précédent conservé. La supervision et les alertes
sur ces journaux restent à raccorder à l’exploitation.

Les notes restent transmises au fournisseur IA configuré. `store:false` est
présent mais ne remplace pas la vérification des paramètres fournisseur et des
règles internes pour les données confidentielles.

## Vérifications

`npm run test:security` compile le projet et teste les API sur des comptes et
projets fictifs, sans appel IA externe payant. Les contrôles incluent les accès,
l’expiration et le changement des temporaires, les tentatives concurrentes,
les sessions partagées et leur révocation, les écritures concurrentes, les
sprints personnels, les conflits, les quotas IA, les verrous et le serveur HTTPS.

`npm audit --package-lock-only` ne signalait aucune vulnérabilité connue après
la mise à jour du 19 novembre 2026. Refaire ce contrôle régulièrement.
La sauvegarde après modification et rechargement a été vérifiée dans l’interface
sur un serveur isolé. Le contrôle ESLint global conserve des erreurs préexistantes
dans les composants React. Les nouveaux modules serveur et le chargement des
sprints ont également été contrôlés séparément.
