# Build stage
FROM golang:1.24-alpine AS builder

# Set working directory
WORKDIR /app

# Install git and certificates
RUN apk add --no-cache git ca-certificates tzdata

# Download dependencies first to cache them
COPY go.mod ./
# COPY go.sum ./ # Uncomment when go.sum is generated
RUN go mod download

# Copy the rest of the source code
COPY . .

# Build a statically linked binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -a -installsuffix cgo -ldflags="-w -s" -o dms-backend ./cmd/server

# Final minimal stage
FROM alpine:3.20

# Import the user and group files from the builder
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

WORKDIR /app

# Add non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy the binary
COPY --from=builder /app/dms-backend .

# Use non-root user
USER appuser

# Expose port
EXPOSE 8080

# Run the binary
CMD ["./dms-backend"]