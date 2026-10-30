# Notes de frais

Application de saisie, validation à deux niveaux et export comptable des notes de frais,
déployée sur Databricks (Apps, Jobs, SQL Warehouse, Unity Catalog).

## Fonctionnalités

- Saisie d'une note multi-lignes, justificatifs (PDF, images) et import Excel des dépenses
- Validation par le manager, puis par la finance ; rejet motivé, correction et nouvelle soumission
- Contrôles automatiques (plafonds, justificatifs, doublons, période) par un job Databricks
- Export comptable Excel (openpyxl) par un job, lancé depuis l'application ou planifié chaque mois
- Rôles déduits des groupes Entra ID (synchronisés dans Databricks) ; historique d'audit de chaque note

## Architecture

```
Navigateur ── React Query ──▶ API REST /api/v1 (Next.js, Databricks Apps)
                                   │  identité : en-têtes du proxy Databricks (SSO Entra ID) + groupes SCIM
                                   ├──▶ Statement Execution API ──▶ SQL Warehouse ──▶ tables Delta
                                   ├──▶ Files API ──▶ volumes receipts / exports
                                   └──▶ Jobs API  ──▶ controls (SQL) · export_accounting (Python + openpyxl)
```

| Rôle (groupe) | Droits |
|---|---|
| Collaborateur (`notes-frais-employes`) | saisir et soumettre ses notes |
| Manager (`notes-frais-managers`) | valider les notes de son équipe directe (1er niveau) |
| Finance (`notes-frais-finance`) | valider (2e niveau), tout consulter, lancer l'export |
| Administrateur (`notes-frais-admins`) | gérer les catégories, consulter ; ne valide pas (séparation des tâches) |

Personne ne valide sa propre note. Le manager est **figé à la soumission**.

## Structure

| Dossier | Contenu |
|---|---|
| `databricks.yml` | Bundle : variables et environnements |
| `resources/` | Une ressource Databricks par fichier (schéma, volumes, jobs, app) |
| `src/setup/` | Notebooks SQL du job de mise en place (tables, référentiels, qualité) |
| `src/jobs/` | Job de contrôle (SQL) et job d'export comptable (Python) |
| `tests/jobs/` | Tests pytest du job d'export |
| `webapp/` | Application Next.js (voir ci-dessous) |

### `webapp/`

| Dossier | Rôle |
|---|---|
| `app/` | Routage uniquement : pages minces et API REST `app/api/v1/**` |
| `features/<domaine>/` | Tranches verticales : schémas Zod et règles pures partagés, `server/` (repository SQL + service), `hooks/` (React Query), `components/`, `views/` |
| `server/` | Infrastructure serveur : configuration, client Databricks (SQL, Files, Jobs), identité, autorisation, socle HTTP (problem+json) |
| `components/` | Composants transverses : shadcn/ui (`ui/`), mise en page, formulaires, états vide/erreur/chargement |
| `lib/` | Client API, format d'erreur, validation, mise en forme |

## Commandes

```bash
# Databricks
databricks bundle validate        # vérifier la configuration
databricks bundle deploy          # déployer en dev
databricks bundle run setup       # créer les tables et les données de référence
databricks bundle run webapp      # démarrer et déployer l'application

# Application (dans webapp/ ; copier .env.example en .env.local)
npm run dev                       # http://localhost:3000, identité simulée par DEV_USER_*
npm run lint && npm run typecheck && npm test && npm run build

# Job d'export (à la racine)
python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m pytest tests
```
