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

	// Server: pool global partagé
	pool := NewWorkerPool(runtime.NumCPU(), runtime.NumCPU()*8)
	defer pool.Close()

	if err := startServer(*port, *maxConn, *readTimeout, *writeTimeout, pool); err != nil {
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

func startServer(port int, maxConn int, readTimeout, writeTimeout time.Duration, pool *WorkerPool) error {
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
			handleClient(c, readTimeout, writeTimeout, pool)
		}(conn)
	}
}

func handleClient(conn net.Conn, readTimeout, writeTimeout time.Duration, pool *WorkerPool) {
	defer conn.Close()

	_ = conn.SetReadDeadline(time.Now().Add(readTimeout))
	_ = conn.SetWriteDeadline(time.Now().Add(writeTimeout))

	// Lecture bornée : 1 MiB max
	sc := bufio.NewScanner(conn)
	sc.Buffer(make([]byte, 0, 4096), 1<<20)

	if ok := sc.Scan(); !ok {
		fmt.Fprintln(conn, "ERREUR: lecture requête (vide / timeout / trop long)")
		return
	}
	line := strings.TrimSpace(sc.Text())
	if line == "" {
		fmt.Fprintln(conn, "ERREUR: requête vide (format: target;nom1,nom2,...)")
		return
	}

	// Format: target;nom1,nom2,nom3
	parts := strings.SplitN(line, ";", 2)
	if len(parts) != 2 {
		fmt.Fprintln(conn, "ERREUR: format attendu target;nom1,nom2,...")
		return
	}

	target := strings.TrimSpace(parts[0])
	list := strings.TrimSpace(parts[1])
	if target == "" || list == "" {
		fmt.Fprintln(conn, "ERREUR: target ou liste vide")
		return
	}

	raw := strings.Split(list, ",")
	names := make([]string, 0, len(raw))
	for _, n := range raw {
		n = strings.TrimSpace(n)
		if n != "" {
			names = append(names, n)
		}
	}
	if len(names) == 0 {
		fmt.Fprintln(conn, "ERREUR: aucun nom valide")
		return
	}

	res := computeDistancesWithPool(pool, target, names)

	// Réponse : "name:dist name:dist ..."
	var sb strings.Builder
	for _, r := range res {
		sb.WriteString(r.Name)
		sb.WriteString(":")
		sb.WriteString(fmt.Sprint(r.Distance))
		sb.WriteString(" ")
	}
	sb.WriteString("\n")
	_, _ = conn.Write([]byte(sb.String()))
}
