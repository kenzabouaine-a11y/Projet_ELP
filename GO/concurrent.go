package main

import (
	"fmt"
	"runtime"
	"sync"
	"time"
)

type Result struct {
	Index    int
	Name     string
	Distance int
}

// =====================================================
// Utils
// =====================================================

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// =====================================================
// Target vs Names
// =====================================================

func computeDistancesSequential(target string, names []string) []Result {
	// Conversion unique pour le séquentiel aussi pour un benchmark juste
	targetRunes := []rune(target)
	out := make([]Result, len(names))
	for i, name := range names {
		out[i] = Result{
			Index:    i,
			Name:     name,
			Distance: Levenshtein([]rune(name), targetRunes),
		}
	}
	return out
}

// Version concurrente CHUNKÉE corrigée
func computeDistancesConcurrentWithWorkers(target string, names []string, workerCount int) []Result {
	n := len(names)
	if n == 0 {
		return nil
	}

	// --- CORRECTION : Conversion unique avant la concurrence ---
	targetRunes := []rune(target)
	namesRunes := make([][]rune, n)
	for i, name := range names {
		namesRunes[i] = []rune(name)
	}

	if workerCount <= 0 {
		workerCount = runtime.NumCPU()
	}
	if workerCount > n {
		workerCount = n
	}

	chunkSize := maxInt(64, n/(workerCount*4))
	if chunkSize > 2048 {
		chunkSize = 2048
	}

	type Job struct {
		Start int
		End   int
	}

	jobs := make(chan Job, workerCount*2)
	results := make(chan []Result, workerCount*2)

	var wg sync.WaitGroup
	wg.Add(workerCount)

	for w := 0; w < workerCount; w++ {
		go func() {
			defer wg.Done()
			for job := range jobs {
				local := make([]Result, 0, job.End-job.Start)
				for i := job.Start; i < job.End; i++ {
					local = append(local, Result{
						Index:    i,
						Name:     names[i],
						// --- CORRECTION : Utilisation des runes pré-converties ---
						Distance: Levenshtein(targetRunes, namesRunes[i]),
					})
				}
				results <- local
			}
		}()
	}

	go func() {
		for start := 0; start < n; start += chunkSize {
			end := start + chunkSize
			if end > n {
				end = n
			}
			jobs <- Job{Start: start, End: end}
		}
		close(jobs)
	}()

	go func() {
		wg.Wait()
		close(results)
	}()

	out := make([]Result, n)
	for batch := range results {
		for _, r := range batch {
			out[r.Index] = r
		}
	}
	return out
}

// =====================================================
// ALL PAIRS (Corrigé également pour les runes)
// =====================================================

func sumAllPairsSequential(names []string) int {
	n := len(names)
	namesRunes := make([][]rune, n)
	for i, name := range names {
		namesRunes[i] = []rune(name)
	}

	sum := 0
	for i := 0; i < n; i++ {
		for j := i + 1; j < n; j++ {
			sum += Levenshtein(namesRunes[i], namesRunes[j])
		}
	}
	return sum
}

func sumAllPairsConcurrent(names []string, workerCount int) int {
	n := len(names)
	if n < 2 {
		return 0
	}

	// Pré-conversion
	namesRunes := make([][]rune, n)
	for i, name := range names {
		namesRunes[i] = []rune(name)
	}

	if workerCount <= 0 {
		workerCount = runtime.NumCPU()
	}

	chunkSize := maxInt(16, n/(workerCount*4))
	if chunkSize > 256 {
		chunkSize = 256
	}

	type Job struct {
		Start int
		End   int
	}

	jobs := make(chan Job, workerCount*2)
	results := make(chan int, workerCount*2)

	var wg sync.WaitGroup
	wg.Add(workerCount)

	for w := 0; w < workerCount; w++ {
		go func() {
			defer wg.Done()
			local := 0
			for job := range jobs {
				for i := job.Start; i < job.End; i++ {
					for j := i + 1; j < n; j++ {
						// Utilisation des runes
						local += Levenshtein(namesRunes[i], namesRunes[j])
					}
				}
			}
			results <- local
		}()
	}

	go func() {
		for i := 0; i < n; i += chunkSize {
			end := i + chunkSize
			if end > n {
				end = n
			}
			jobs <- Job{Start: i, End: end}
		}
		close(jobs)
	}()

	go func() {
		wg.Wait()
		close(results)
	}()

	sum := 0
	for v := range results {
		sum += v
	}
	return sum
}



// =====================================================
// Bench utils
// =====================================================

func benchMedian(iters int, fn func()) time.Duration {
	for i := 0; i < 5; i++ {
		fn()
	}
	durs := make([]time.Duration, 0, iters)
	for i := 0; i < iters; i++ {
		start := time.Now()
		fn()
		durs = append(durs, time.Since(start))
	}
	for i := 0; i < len(durs); i++ {
		for j := i + 1; j < len(durs); j++ {
			if durs[j] < durs[i] {
				durs[i], durs[j] = durs[j], durs[i]
			}
		}
	}
	return durs[len(durs)/2]
}

// =====================================================
// Benchmarks
// =====================================================

func benchmarkTargetVsNames(target string, names []string, counts []int) {
	iters := 50
	fmt.Printf("Benchmark target-vs-names sur %d noms\n", len(names))

	durSeq := benchMedian(iters, func() {
		_ = computeDistancesSequential(target, names)
	})
	fmt.Printf("Séquentiel : %v\n", durSeq)

	for _, wc := range counts {
		dur := benchMedian(iters, func() {
			_ = computeDistancesConcurrentWithWorkers(target, names, wc)
		})
		fmt.Printf("Concurrent (%2d workers) : %v (ratio=%.2fx)\n",
			wc, dur, float64(durSeq)/float64(dur))
	}
}

func benchmarkAllPairs(names []string, counts []int) {
	iters := 10
	fmt.Printf("Benchmark all-pairs (%d noms)\n", len(names))

	check := sumAllPairsSequential(names)
	durSeq := benchMedian(iters, func() {
		_ = sumAllPairsSequential(names)
	})
	fmt.Printf("Séquentiel : %v\n", durSeq)

	for _, wc := range counts {
		var res int
		dur := benchMedian(iters, func() {
			res = sumAllPairsConcurrent(names, wc)
		})
		ok := "OK"
		if res != check {
			ok = "DIFF"
		}
		fmt.Printf("Concurrent (%2d workers) : %v (ratio=%.2fx) [%s]\n",
			wc, dur, float64(durSeq)/float64(dur), ok)
	}
}
