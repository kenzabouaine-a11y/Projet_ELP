package main

import (
    "fmt"
    "os"
)

func main() {
    // Crée (ou écrase) un fichier names.txt dans le dossier courant
    f, err := os.Create("names.txt")
    if err != nil {
        panic(err)
    }
    defer f.Close()

    // Écrit 10 000 lignes : name_0, name_1, ..., name_9999
    for i := 0; i < 100000; i++ {
        fmt.Fprintf(f, "name_%d\n", i)
    }
}
