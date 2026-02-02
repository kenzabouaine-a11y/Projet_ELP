Go Levenshtein — Concurrence & TCP

Description
Projet Go calculant des distances de Levenshtein :

en local (benchmark de performances),

via un serveur TCP accessible par un client.

Le calcul utilise un pool de workers (concurrence).

Prérequis

Go ≥ 1.20

Fichier names.txt (un nom par ligne)

Lancer les benchmarks

Target vs liste de noms
Commande :
go run main.go concurrent.go levenshtein.go -mode=bench -bench=target -k=10000 -target=alice

All-pairs (comparaison entre tous les noms)
Commande :
go run main.go concurrent.go levenshtein.go -mode=bench -bench=pairs -k=2000

Lancer le serveur TCP
Commande :
go run main.go concurrent.go levenshtein.go -mode=server

Le serveur écoute sur le port 8000 par défaut.

Lancer le client
Dans un autre terminal :
go run client.go

Entrer une requête au format :
target;nom1,nom2,nom3

Exemple :
alice;bob,alicia,alex

Résumé

mode=bench : tester les performances du calcul concurrent

mode=server : lancer le serveur TCP

client.go : envoyer une requête au serveur