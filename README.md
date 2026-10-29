# Notes de frais

Application de saisie, validation à deux niveaux et export comptable des notes de frais,
déployée sur Databricks.

## Fonctionnalités

- Saisie d'une note multi-lignes avec justificatifs
- Validation par le manager, puis par la finance
- Contrôles automatiques (plafonds, doublons) par un job Databricks
- Export comptable mensuel planifié

## Architecture

```
Navigateur ──▶ Databricks Apps (Next.js) ──▶ SQL Warehouse ──▶ tables Delta
                       │
                       ├──▶ Files API ──▶ Volume (justificatifs)
                       └──▶ Jobs API  ──▶ jobs de contrôle et d'export
```

## Structure

| Dossier | Contenu |
|---|---|
| `databricks.yml` | Bundle : variables et environnements |
| `resources/` | Une ressource Databricks par fichier |
| `src/setup/` | Notebooks du job de mise en place |
| `webapp/` | Application Next.js |

## Commandes

```bash
databricks bundle validate   # vérifier la configuration
databricks bundle deploy     # déployer en dev
databricks bundle run setup  # créer les tables et les données de référence
```