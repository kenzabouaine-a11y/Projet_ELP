package main

import (
    "bufio"
    "fmt"
    "log"
    "net"
    "os"
    "strings"
)

// =======================
// V0 : deux mots en dur
// =======================

func runV0() {
    fmt.Println("=== V0 : deux mots en dur ===")
    fmt.Println("dist(\"test\", \"texte\") avec LevenshteinOld =", LevenshteinOld("test", "texte"))
    fmt.Println("dist(\"test\", \"texte\") avec Levenshtein     =", Levenshtein("test", "texte"))
}

// =======================
// V1 : local, fichier, séquentiel
// =======================

func runV1() {
    target := "alice"
    names := []string{"alice", "alicia", "bob", "robert", "alixe", "alain"}

    fmt.Println("=== V1 : local séquentiel (sans TCP) ===")
    results := computeDistancesSequential(target, names)
    for _, r := range results {
        fmt.Printf("%s -> %d\n", r.Name, r.Distance)
    }
}

// Variante V1b : même chose mais en lisant names.txt
func runV1File() {
    target := "alice"

    file, err := os.Open("names.txt")
    if err != nil {
        log.Fatalf("Erreur ouverture fichier: %v", err)
    }
    defer file.Close()

    scanner := bufio.NewScanner(file)
    var names []string
    for scanner.Scan() {
        line := strings.TrimSpace(scanner.Text())
        if line != "" {
            names = append(names, line)
        }
    }
    if err := scanner.Err(); err != nil {
        log.Fatalf("Erreur lecture fichier: %v", err)
    }

    fmt.Println("=== V1 (fichier) : local séquentiel ===")
    results := computeDistancesSequential(target, names)
    for _, r := range results {
        fmt.Printf("%s -> %d\n", r.Name, r.Distance)
    }
}

// =======================
// V2 : serveur TCP concurrent
// =======================

func runServerV2() {
    ln, err := net.Listen("tcp", ":8000")
    if err != nil {
        log.Fatalf("Erreur Listen: %v", err)
    }
    defer ln.Close()

    log.Println("Serveur TCP Levenshtein en écoute sur le port 8000...")

    for {
        conn, err := ln.Accept()
        if err != nil {
            log.Printf("Erreur Accept: %v", err)
            continue
        }
        go handleClient(conn)
    }
}

// handleClient gère UNE connexion client
func handleClient(conn net.Conn) {
    defer conn.Close()

    reader := bufio.NewReader(conn)

    line, err := reader.ReadString('\n')
    if err != nil {
        log.Printf("Erreur lecture client: %v", err)
        return
    }

    line = strings.TrimSpace(line)
    if line == "" {
        log.Printf("Ligne vide reçue")
        return
    }

    parts := strings.SplitN(line, ";", 2)
    if len(parts) != 2 {
        log.Printf("Format incorrect: %s", line)
        fmt.Fprintln(conn, "ERREUR: format attendu target;nom1,nom2,...")
        return
    }

    target := parts[0]
    namesPart := parts[1]

    if target == "" || namesPart == "" {
        log.Printf("Target ou liste de noms vide")
        fmt.Fprintln(conn, "ERREUR: target ou liste de noms vide")
        return
    }

    rawNames := strings.Split(namesPart, ",")
    var names []string
    for _, n := range rawNames {
        n = strings.TrimSpace(n)
        if n != "" {
            names = append(names, n)
        }
    }

    if len(names) == 0 {
        fmt.Fprintln(conn, "ERREUR: aucun nom fourni")
        return
    }

    // V1 (séquentiel) – pour comparaison, si tu veux tester :
    // results := computeDistancesSequential(target, names)

    // V2 (concurrent) – version finale
    results := computeDistancesConcurrent(target, names)

    var sb strings.Builder
    for i, res := range results {
        if i > 0 {
            sb.WriteString(",")
        }
        sb.WriteString(res.Name)
        sb.WriteString(":")
        sb.WriteString(fmt.Sprint(res.Distance))
    }
    sb.WriteString("\n")

    _, err = conn.Write([]byte(sb.String()))
    if err != nil {
        log.Printf("Erreur écriture vers client: %v", err)
        return
    }
}

// =======================
// main : sélection de la version
// =======================

func main() {
    // Choisis ce que tu veux lancer :

    // V0 : deux mots
    // runV0()

    // V1 : local séquentiel (tableau en dur)
    // runV1()

    // V1b : local séquentiel, lecture de names.txt
    // runV1File()

    // V2 : serveur TCP concurrent (version finale que tu utilises pour le projet)
    runServerV2()
}
