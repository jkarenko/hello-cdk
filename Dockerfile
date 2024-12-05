FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o hello


FROM scratch
COPY --from=builder /app/hello /hello
EXPOSE 8080
ENTRYPOINT ["/hello"]
