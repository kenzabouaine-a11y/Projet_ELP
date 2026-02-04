package main

import (
	"runtime"
	"sync"
)

// WorkerPool est un pool GLOBAL (persistant) de workers.
// Il évite de recréer des goroutines à chaque requête côté serveur.
type chunkJob struct {
	target []rune   // CHANGEMENT : Utilise des runes pour la performance
	names  [][]rune // CHANGEMENT : Liste de noms déjà convertis en runes
	rawNames []string // Gardé pour remplir le champ 'Name' du Result
	start  int
	end    int
	out    chan<- []Result
}

type WorkerPool struct {
    jobs        chan chunkJob
    workerCount int
    wg          sync.WaitGroup
}


func NewWorkerPool(workerCount int, queueSize int) *WorkerPool {
	if workerCount <= 0 {
		workerCount = runtime.NumCPU()
	}
	if queueSize <= 0 {
		queueSize = workerCount * 8
	}

	p := &WorkerPool{
    jobs:        make(chan chunkJob, queueSize),
    workerCount: workerCount,
	}

	p.wg.Add(workerCount)

	for i := 0; i < workerCount; i++ {
		go func() {
			defer p.wg.Done()
			for job := range p.jobs {
				local := make([]Result, 0, job.end-job.start)
				for idx := job.start; idx < job.end; idx++ {
					// Utilisation de la version optimisée avec []rune
					local = append(local, Result{
						Index:    idx,
						Name:     job.rawNames[idx],
						Distance: Levenshtein(job.target, job.names[idx]),
					})
				}
				job.out <- local
			}
		}()
	}

	return p
}

func (p *WorkerPool) Close() {
	close(p.jobs)
	p.wg.Wait()
}

func computeDistancesWithPool(pool *WorkerPool, target string, names []string) []Result {
	n := len(names)
	if n == 0 {
		return nil
	}

	targetRunes := []rune(target)
	namesRunes := make([][]rune, n)
	for i, name := range names {
		namesRunes[i] = []rune(name)
	}

	workerCount := pool.workerCount
	if workerCount > n {
		workerCount = n
	}

	chunkSize := maxInt(64, n/(workerCount*4))
	if chunkSize > 2048 {
		chunkSize = 2048
	}

	jobCount := 0
	outCh := make(chan []Result, workerCount*2)

	for start := 0; start < n; start += chunkSize {
		end := start + chunkSize
		if end > n {
			end = n
		}
		jobCount++

		pool.jobs <- chunkJob{
			target:   targetRunes,
			names:    namesRunes,
			rawNames: names,
			start:    start,
			end:      end,
			out:      outCh,
		}
	}

	out := make([]Result, n)
	for i := 0; i < jobCount; i++ {
		batch := <-outCh
		for _, r := range batch {
			out[r.Index] = r
		}
	}
	return out
}
