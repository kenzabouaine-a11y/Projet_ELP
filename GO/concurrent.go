package main

import "sync"

type Result struct {
    Name     string
    Distance int
}

type Job struct {
    Target string
    Name   string
}

// V1 : calcul séquentiel (sans goroutines)
func computeDistancesSequential(target string, names []string) []Result {
    out := make([]Result, 0, len(names))
    for _, name := range names {
        d := Levenshtein(target, name) // ou LevenshteinOld si tu veux comparer
        out = append(out, Result{Name: name, Distance: d})
    }
    return out
}

// V2 : calcul concurrent avec worker pool
func computeDistancesConcurrent(target string, names []string) []Result {
    const workerCount = 4

    jobs := make(chan Job)
    results := make(chan Result)

    var wg sync.WaitGroup

    wg.Add(workerCount)
    for i := 0; i < workerCount; i++ {
        go worker(jobs, results, &wg)
    }

    go func() {
        for _, name := range names {
            jobs <- Job{Target: target, Name: name}
        }
        close(jobs)
    }()

    go func() {
        wg.Wait()
        close(results)
    }()

    var out []Result
    for res := range results {
        out = append(out, res)
    }

    return out
}

func worker(jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
    defer wg.Done()

    for job := range jobs {
        d := Levenshtein(job.Target, job.Name)
        results <- Result{Name: job.Name, Distance: d}
    }
}
