package main

import (
    "bufio"
    "fmt"
    "net"
    "os"
    "strings"
)

func main() {
    // 1. Construire la requête à envoyer
    // Exemple : target = alice, noms = alice,alicia,bob,robert,alixe,alain
    target := "alice"
    names := []string{"alice", "alicia", "bob", "robert", "alixe", "alain"}

    // Si tu veux lire les noms depuis la ligne de commande, tu pourras adapter plus tard.

    // Construire la chaîne "alice;alice,alicia,bob,robert,alixe,alain\n"
    req := buildRequest(target, names)

    // 2. Se connecter au serveur TCP
    conn, err := net.Dial("tcp", "127.0.0.1:8000")
    if err != nil {
        fmt.Println("Erreur de connexion au serveur:", err)
        os.Exit(1)
    }
    defer conn.Close()

    // 3. Envoyer la requête
    _, err = conn.Write([]byte(req))
    if err != nil {
        fmt.Println("Erreur à l'envoi de la requête:", err)
        return
    }

    // 4. Lire la réponse (une ligne)
    reader := bufio.NewReader(conn)
    resp, err := reader.ReadString('\n')
    if err != nil {
        fmt.Println("Erreur en lisant la réponse:", err)
        return
    }

    resp = strings.TrimSpace(resp)
    fmt.Println("Réponse du serveur:")
    fmt.Println(resp)
}

// buildRequest construit "target;nom1,nom2,...\n"
func buildRequest(target string, names []string) string {
    return target + ";" + strings.Join(names, ",") + "\n"
}
