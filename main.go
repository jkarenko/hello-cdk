package main

import (
	"fmt"
	"net/http"
)

func rootHandler(w http.ResponseWriter, r *http.Request) {
    // list endpoints
    fmt.Fprint(w, "API endpoints\n/health\n/hello")
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprint(w, "OK")
}

func helloHandler(w http.ResponseWriter, r *http.Request) {
    name := r.URL.Query().Get("name")
    if name == "" {
        fmt.Fprint(w, "Hello, World!")
        return
    }
    fmt.Fprintf(w, "Hello, %s!", name)
}

func main() {
    http.HandleFunc("/", rootHandler)
    http.HandleFunc("/health", healthHandler)
    http.HandleFunc("/hello", helloHandler)
    http.ListenAndServe(":8080", nil)
}
