package main

import (
	"runtime"
	"sync"
)

// WorkerPool est un pool GLOBAL (persistant) de workers.
// Il évite de recréer des goroutines à chaque requête côté serveur.
// Les benchmarks peuvent continuer à utiliser computeDistancesConcurrentWithWorkers.

type chunkJob struct {
	target string
	names  []string
	start  int
	end    int
	out    chan<- []Result
}

type WorkerPool struct {
	jobs chan chunkJob
	wg   sync.WaitGroup
}

func NewWorkerPool(workerCount int, queueSize int) *WorkerPool {
	if workerCount <= 0 {
		workerCount = runtime.NumCPU()
	}
	if queueSize <= 0 {
		queueSize = workerCount * 8
	}

	p := &WorkerPool{jobs: make(chan chunkJob, queueSize)}
	p.wg.Add(workerCount)

	for i := 0; i < workerCount; i++ {
		go func() {
			defer p.wg.Done()
			for job := range p.jobs {
				local := make([]Result, 0, job.end-job.start)
				for idx := job.start; idx < job.end; idx++ {
					name := job.names[idx]
					local = append(local, Result{
						Index:    idx,
						Name:     name,
						Distance: Levenshtein(job.target, name),
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

// computeDistancesWithPool découpe en chunks et délègue chaque chunk au pool.
func computeDistancesWithPool(pool *WorkerPool, target string, names []string) []Result {
	n := len(names)
	if n == 0 {
		return nil
	}

	// Chunking proche de votre version locale (efficace).
	workerCount := runtime.NumCPU()
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
		pool.jobs <- chunkJob{target: target, names: names, start: start, end: end, out: outCh}
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
