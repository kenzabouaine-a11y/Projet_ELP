package main

import (
	"bufio"
	"flag"
	"fmt"
	"net"
	"os"
	"runtime"
	"strings"
	"time"
)

func main() {
	mode := flag.String("mode", "server", "server | bench")
	bench := flag.String("bench", "target", "target | pairs")
	target := flag.String("target", "alice", "target")
	k := flag.Int("k", 2000, "nb noms")
	port := flag.Int("port", 8000, "port TCP")

	maxConn := flag.Int("maxconn", 128, "nb max de connexions simultanées")
	readTimeout := flag.Duration("readTimeout", 5*time.Second, "timeout lecture TCP")
	writeTimeout := flag.Duration("writeTimeout", 5*time.Second, "timeout écriture TCP")

	//  Amélioration: filtre sur distance maximale (-1 = pas de filtre)
	maxDist := flag.Int("maxdist", -1, "distance maximale (-1 = pas de filtre)")

	flag.Parse()

	// Bench: on a besoin de names.txt
	if *mode == "bench" {
		names, err := loadNames("names.txt", *k)
		if err != nil {
			fmt.Println("Erreur lecture names.txt:", err)
			return
		}
		counts := []int{1, 4, 8, 16, 32}

		if *bench == "pairs" {
			benchmarkAllPairs(names, counts)
		} else {
			benchmarkTargetVsNames(*target, names, counts)
		}
		return
	}

	// Étape 1: Server = pool global partagé (créé UNE fois)
	pool := NewWorkerPool(runtime.NumCPU(), runtime.NumCPU()*8)
	defer pool.Close()

	//  Amélioration: on passe maxDist au serveur
	if err := startServer(*port, *maxConn, *readTimeout, *writeTimeout, pool, *maxDist); err != nil {
		fmt.Println("Erreur serveur:", err)
	}
}

func loadNames(path string, limit int) ([]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	sc := bufio.NewScanner(f)
	var names []string
	for sc.Scan() {
		if limit > 0 && len(names) >= limit {
			break
		}
		s := strings.TrimSpace(sc.Text())
		if s != "" {
			names = append(names, s)
		}
	}
	if err := sc.Err(); err != nil {
		return nil, err
	}
	return names, nil
}

//  startServer prend maintenant maxDist
func startServer(port int, maxConn int, readTimeout, writeTimeout time.Duration, pool *WorkerPool, maxDist int) error {
	addr := fmt.Sprintf(":%d", port)
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("impossible d'écouter sur %s : %w", addr, err)
	}
	defer ln.Close()

	if maxConn <= 0 {
		maxConn = 128
	}
	sem := make(chan struct{}, maxConn) // limiteur de sessions

	fmt.Printf("Serveur TCP sur le port %d (maxConn=%d)\n", port, maxConn)

	for {
		conn, err := ln.Accept()
		if err != nil {
			fmt.Println("Erreur Accept:", err)
			continue
		}

		sem <- struct{}{} // bloque si trop de connexions actives
		go func(c net.Conn) {
			defer func() { <-sem }()
			//  on passe maxDist à handleClient
			handleClient(c, readTimeout, writeTimeout, pool, maxDist)
		}(conn)
	}
}

//  handleClient prend maintenant maxDist
func handleClient(conn net.Conn, readTimeout, writeTimeout time.Duration, pool *WorkerPool, maxDist int) {
	defer conn.Close()

	_ = conn.SetReadDeadline(time.Now().Add(readTimeout))

	sc := bufio.NewScanner(conn)
	sc.Buffer(make([]byte, 0, 4096), 1<<20)

	if ok := sc.Scan(); !ok {
		if err := sc.Err(); err != nil {
			fmt.Printf("Erreur lecture client %v: %v\n", conn.RemoteAddr(), err)
		}
		return
	}

	line := strings.TrimSpace(sc.Text())
	if line == "" {
		return
	}

	parts := strings.SplitN(line, ";", 2)
	if len(parts) != 2 {
		_, _ = fmt.Fprintln(conn, "ERREUR: format attendu target;nom1,nom2,...")
		return
	}

	target := strings.TrimSpace(parts[0])
	namesRaw := strings.Split(parts[1], ",")

	var names []string
	for _, n := range namesRaw {
		if trimmed := strings.TrimSpace(n); trimmed != "" {
			names = append(names, trimmed)
		}
	}

	if len(names) == 0 {
		_, _ = fmt.Fprintln(conn, "ERREUR: aucun nom fourni")
		return
	}

	res := computeDistancesWithPool(pool, target, names)

	//  Filtre maxDist (si activé)
	if maxDist >= 0 {
		filtered := res[:0] // réutilise le backing array
		for _, r := range res {
			if r.Distance <= maxDist {
				filtered = append(filtered, r)
			}
		}
		res = filtered
	}

	var sb strings.Builder
	for i, r := range res {
		sb.WriteString(r.Name)
		sb.WriteString(":")
		sb.WriteString(fmt.Sprint(r.Distance))
		if i < len(res)-1 {
			sb.WriteString(" ")
		}
	}
	sb.WriteString("\n")

	_ = conn.SetWriteDeadline(time.Now().Add(writeTimeout))
	_, err := conn.Write([]byte(sb.String()))
	if err != nil {
		fmt.Printf("Erreur écriture vers %v: %v\n", conn.RemoteAddr(), err)
	}
}
