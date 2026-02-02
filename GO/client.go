package main

import (
	"bufio"
	"fmt"
	"net"
	"os"
)

func main() {
	conn, err := net.Dial("tcp", "localhost:8000")
	if err != nil {
		fmt.Println("Erreur connexion")
		return
	}
	defer conn.Close()

	fmt.Println("Entrer : target;nom1,nom2,nom3")
	in := bufio.NewReader(os.Stdin)
	text, _ := in.ReadString('\n')

	fmt.Fprint(conn, text)

	resp, _ := bufio.NewReader(conn).ReadString('\n')
	fmt.Println("Réponse serveur :", resp)
}
