package main

import (
	"bufio"
	"fmt"
	"net"
	"os"
	"strings"
)

func main() {
	// Connexion au serveur
	conn, err := net.Dial("tcp", "localhost:8000")
	if err != nil {
		fmt.Println("Erreur connexion :", err)
		return
	}
	defer conn.Close()

	fmt.Println("Entrer : target;nom1,nom2,nom3")
	
	// Lecture de l'entrée utilisateur
	reader := bufio.NewReader(os.Stdin)
	text, err := reader.ReadString('\n')
	if err != nil {
		fmt.Println("Erreur lecture entrée :", err)
		return
	}

	// Nettoyage et envoi explicite avec un saut de ligne (\n)
	// On utilise Fprintln pour être sûr que le serveur reçoive le délimiteur
	_, err = fmt.Fprintln(conn, strings.TrimSpace(text))
	if err != nil {
		fmt.Println("Erreur envoi au serveur :", err)
		return
	}

	// Lecture de la réponse du serveur
	// On attend la ligne de réponse terminée par \n
	serverReader := bufio.NewReader(conn)
	resp, err := serverReader.ReadString('\n')
	if err != nil {
		fmt.Println("Erreur réception serveur (timeout possible) :", err)
		return
	}

	fmt.Print("Réponse serveur : ", resp)
}