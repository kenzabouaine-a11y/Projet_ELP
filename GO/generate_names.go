package main

import (
    "fmt"
    "math/rand" 
    "os"    
)

func main() {
    f, _ := os.Create("names.txt")
    defer f.Close()

    // Génère des noms aléatoires de longueurs différentes
    for i := 0; i < 10000; i++ {
        length := 5 + rand.Intn(10)
        b := make([]byte, length)
        for j := range b {
            b[j] = byte('a' + rand.Intn(26))
        }
        fmt.Fprintf(f, "%s\n", string(b))
    }
}
