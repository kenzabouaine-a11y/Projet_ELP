package main

import "unicode/utf8"

//////////////////////////
// Ancienne version (2D)
//////////////////////////

// LevenshteinOld calcule la distance d'édition entre deux chaînes a et b
// avec une matrice 2D de taille O(len(a)*len(b)).
// Gardé pour l'historique / comparaison.
func LevenshteinOld(a, b string) int {
    la := len(a)
    lb := len(b)

    // Si une des chaînes est vide
    if la == 0 {
        return lb
    }
    if lb == 0 {
        return la
    }

    // Matrice (la+1) x (lb+1)
    dp := make([][]int, la+1)
    for i := 0; i <= la; i++ {
        dp[i] = make([]int, lb+1)
    }

    // Initialisation de la première ligne / colonne
    for i := 0; i <= la; i++ {
        dp[i][0] = i
    }
    for j := 0; j <= lb; j++ {
        dp[0][j] = j
    }

    // Remplir la matrice
    for i := 1; i <= la; i++ {
        for j := 1; j <= lb; j++ {
            cost := 0
            if a[i-1] != b[j-1] {
                cost = 1
            }

            deletion := dp[i-1][j] + 1
            insertion := dp[i][j-1] + 1
            substitution := dp[i-1][j-1] + cost

            dp[i][j] = min3(deletion, insertion, substitution)
        }
    }

    return dp[la][lb]
}

// min3 renvoie le minimum de trois entiers.
func min3(a, b, c int) int {
    m := a
    if b < m {
        m = b
    }
    if c < m {
        m = c
    }
    return m
}

/////////////////////////////
// Nouvelle version optimisée
/////////////////////////////

// minLengthThreshold est un seuil pour éviter des allocations
// pour les petites chaînes.
const minLengthThreshold = 32

// Levenshtein calcule la distance de Levenshtein entre a et b
// avec une DP 1D O(min(len(a), len(b))) et quelques optimisations.
func Levenshtein(a, b string) int {
    // Gestion des cas simples
    if len(a) == 0 {
        return utf8.RuneCountInString(b)
    }
    if len(b) == 0 {
        return utf8.RuneCountInString(a)
    }
    if a == b {
        return 0
    }

    // Conversion en runes pour bien gérer l'Unicode
    s1 := []rune(a)
    s2 := []rune(b)

    // On met la plus courte dans s1 pour minimiser la mémoire
    if len(s1) > len(s2) {
        s1, s2 = s2, s1
    }

    // On enlève le suffixe commun
    s1, s2 = trimLongestCommonSuffix(s1, s2)
    // On enlève le préfixe commun
    s1, s2 = trimLongestCommonPrefix(s1, s2)

    lenS1 := len(s1)
    lenS2 := len(s2)

    // Si après trimming il n'y a plus rien dans s1
    if lenS1 == 0 {
        return lenS2
    }

    // Initialisation de la rangée (1D DP)
    var x []uint16
    if lenS1+1 > minLengthThreshold {
        x = make([]uint16, lenS1+1)
    } else {
        x = make([]uint16, minLengthThreshold)
        x = x[:lenS1+1]
    }

    for i := 1; i < lenS1+1; i++ {
        x[i] = uint16(i)
    }

    // Hoist bounds check
    _ = x[lenS1]
    y := x[1:]
    y = y[:lenS1]

    // Remplissage de la DP
    for i := 0; i < lenS2; i++ {
        prev := uint16(i + 1)
        for j := 0; j < lenS1; j++ {
            current := x[j] // cas de match
            if s2[i] != s1[j] {
                current = minU16(x[j], prev, y[j]) + 1
            }
            x[j] = prev
            prev = current
        }
        x[lenS1] = prev
    }

    return int(x[lenS1])
}

// trimLongestCommonSuffix enlève le suffixe commun.
func trimLongestCommonSuffix(a, b []rune) ([]rune, []rune) {
    m := minInt(len(a), len(b))
    a2 := a[len(a)-m:]
    b2 := b[len(b)-m:]
    i := len(a2)
    b2 = b2[:i]
    for ; i > 0 && a2[i-1] == b2[i-1]; i-- {
        // vide volontairement
    }
    return a[:len(a)-len(a2)+i], b[:len(b)-len(b2)+i]
}

// trimLongestCommonPrefix enlève le préfixe commun.
func trimLongestCommonPrefix(a, b []rune) ([]rune, []rune) {
    var i int
    for m := minInt(len(a), len(b)); i < m && a[i] == b[i]; i++ {
        // vide volontairement
    }
    return a[i:], b[i:]
}

func minInt(a, b int) int {
    if a < b {
        return a
    }
    return b
}

func minU16(a, b, c uint16) uint16 {
    m := a
    if b < m {
        m = b
    }
    if c < m {
        m = c
    }
    return m
}




