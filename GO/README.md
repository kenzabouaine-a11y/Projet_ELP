# Go Levenshtein — Concurrence & Serveur TCP

##  Description générale

Ce projet implémente le calcul de la **distance de Levenshtein** en **Go**, en mettant l’accent sur :

- La **concurrence** (goroutines, channels, worker pool).
- La **mesure de performance** (benchmarks).
- Une **architecture client / serveur TCP**.
- La **robustesse réseau** (timeouts, limitation de connexions).
- Une **amélioration fonctionnelle** via un filtrage des résultats.

Le projet illustre des concepts fondamentaux de Go vus en cours.

---

##  Distance de Levenshtein (rappel)

La distance de Levenshtein entre deux chaînes correspond au **nombre minimal d’opérations** nécessaires pour transformer l’une en l’autre (insertion, suppression, substitution de caractères).

Exemple (cible : `alice`) :

| Mot     | Distance |
|--------|----------|
| alicia | 2        |
| bob    | 3        |
| alex   | 4        |

---

##  Fonctionnalités principales

- **Calcul optimisé** : Utilisation de `[]rune` pour minimiser les allocations et gérer l'Unicode.
- **Concurrence** : Distribution des calculs via goroutines et channels.
- **Worker pool** :
  - **Éphémère** : Pour les benchmarks locaux (concurrent.go).
  - **Persistant** : Pour le serveur TCP (créé une seule fois au démarrage) (worker_pool.go).
- **Serveur TCP** : Multi-clients avec limitation de connexions simultanées.
- **Gestion des Timeouts** : Délais de lecture et d'écriture pour éviter les connexions fantômes.

---

##  Structure du projet

> ⚠️ Il ne faut **PAS** utiliser `go run .` car le projet contient plusieurs fonctions `main()`.

- `main.go` : Serveur TCP et lanceur de benchmarks.
- `concurrent.go` : Algorithme concurrent par chunks.
- `worker_pool.go` : Gestion du pool de workers persistant.
- `levenshtein.go` : Logique de calcul pure.
- `client.go` : Client interactif pour tester le serveur.
- `generate_names.go` : Générateur de données de test.

---

##  Mode Benchmark (local)

###  Target vs liste de noms
Calcule la distance entre une cible et une liste de noms.
```bash
go run main.go concurrent.go levenshtein.go worker_pool.go -mode=bench -bench=target -k=10000 -target=alice
```
### All-pairs (comparaison complète)
Calcule toutes les distances entre tous les noms (très coûteux).
```bash
go run main.go concurrent.go levenshtein.go worker_pool.go -mode=bench -bench=pairs -k=1000
```
---

## Serveur TCP
Le serveur utilise un pool de workers persistant partagé entre tous les clients.
### Lancer le serveur
```bash
go run main.go concurrent.go levenshtein.go worker_pool.go -mode=server -port=8000 -readTimeout=5m

```
```bash
go run main.go concurrent.go levenshtein.go worker_pool.go -mode=server -maxdist=2 -readTimeout=5m
```

### Options du serveur
| Flag        |Description        |Défaut   |
-------------- ------------------- ----------
|port         |Port TCP           |8000     |
|maxconn      |Connexions max     |128      |
|readTimeout  |Timeout lecture    |5s       |
|writeTimeout |Timeout écriture   |5s       |

### Client TCP
#### Lancer le client
```bash
go run client.go
```
#### Format de requête
cible;nom1,nom2,nom3

---

## Choix techniques & Justification
1-Worker pool persistant : Évite la création répétée de goroutines, stabilisant les ressources serveur.

2-Utilisation des Runes : Conversion unique en []rune pour maximiser la vitesse de calcul (Objectif "Faster").

3-Sémaphore de connexion : Utilisation d'un canal tamponné pour limiter les fichiers ouverts (ulimit -n).


