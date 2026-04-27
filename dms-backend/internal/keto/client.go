package keto

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"sync"
	"time"

	acl "github.com/ory/keto/proto/ory/keto/relation_tuples/v1alpha2"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type CircuitBreaker struct {
	mu           sync.Mutex
	failures     int
	lastFailure  time.Time
	maxFailures  int
	resetTimeout time.Duration
}

func (cb *CircuitBreaker) Allow() bool {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	if cb.failures >= cb.maxFailures {
		if time.Since(cb.lastFailure) > cb.resetTimeout {
			return true
		}
		return false
	}
	return true
}

func (cb *CircuitBreaker) RecordSuccess() {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	cb.failures = 0
}

func (cb *CircuitBreaker) RecordFailure() {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	cb.failures++
	cb.lastFailure = time.Now()
}

type Client struct {
	readConn  *grpc.ClientConn
	writeConn *grpc.ClientConn
	readSvc   acl.ReadServiceClient
	writeSvc  acl.WriteServiceClient
	checkSvc  acl.CheckServiceClient
	breaker   *CircuitBreaker
}

func NewClient(readAddr, writeAddr string) *Client {
	readAddr = strings.TrimPrefix(readAddr, "http://")
	readAddr = strings.TrimPrefix(readAddr, "https://")
	writeAddr = strings.TrimPrefix(writeAddr, "http://")
	writeAddr = strings.TrimPrefix(writeAddr, "https://")

	slog.Info("Initializing Keto gRPC Clients", "read", readAddr, "write", writeAddr)

	readConn, err := grpc.Dial(readAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		slog.Error("Dial Keto Read failed", "error", err)
	}

	writeConn, err := grpc.Dial(writeAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		slog.Error("Dial Keto Write failed", "error", err)
	}

	return &Client{
		readConn:  readConn,
		writeConn: writeConn,
		readSvc:   acl.NewReadServiceClient(readConn),
		writeSvc:  acl.NewWriteServiceClient(writeConn),
		checkSvc:  acl.NewCheckServiceClient(readConn),
		breaker: &CircuitBreaker{
			maxFailures:  3,
			resetTimeout: 10 * time.Second,
		},
	}
}

var ErrServiceUnavailable = errors.New("keto authorization service is temporarily unavailable")

func (c *Client) CheckPermission(ctx context.Context, namespace, object, relation, subject string) (bool, error) {
	if !c.breaker.Allow() {
		return false, ErrServiceUnavailable
	}
	ctxTimeout, cancel := context.WithTimeout(ctx, 500*time.Millisecond)
	defer cancel()

	resp, err := c.checkSvc.Check(ctxTimeout, &acl.CheckRequest{
		Namespace: namespace,
		Object:    object,
		Relation:  relation,
		Subject:   &acl.Subject{Ref: &acl.Subject_Id{Id: subject}},
	})
	if err != nil {
		slog.Error("Keto Check failed", "error", err, "ns", namespace, "obj", object)
		c.breaker.RecordFailure()
		return false, err
	}
	c.breaker.RecordSuccess()
	return resp.Allowed, nil
}

func (c *Client) CreateRelationship(ctx context.Context, namespace, object, relation, subject string) error {
	if !c.breaker.Allow() {
		return ErrServiceUnavailable
	}
	ctxTimeout, cancel := context.WithTimeout(ctx, 500*time.Millisecond)
	defer cancel()

	_, err := c.writeSvc.TransactRelationTuples(ctxTimeout, &acl.TransactRelationTuplesRequest{
		RelationTupleDeltas: []*acl.RelationTupleDelta{
			{
				Action: acl.RelationTupleDelta_ACTION_INSERT,
				RelationTuple: &acl.RelationTuple{
					Namespace: namespace,
					Object:    object,
					Relation:  relation,
					Subject:   &acl.Subject{Ref: &acl.Subject_Id{Id: subject}},
				},
			},
		},
	})
	if err != nil {
		slog.Error("Keto CreateRelationship failed", "error", err)
		c.breaker.RecordFailure()
		return err
	}
	c.breaker.RecordSuccess()
	return nil
}

func (c *Client) DeleteRelationship(ctx context.Context, namespace, object, relation, subject string) error {
	if !c.breaker.Allow() {
		return ErrServiceUnavailable
	}
	ctxTimeout, cancel := context.WithTimeout(ctx, 500*time.Millisecond)
	defer cancel()

	_, err := c.writeSvc.TransactRelationTuples(ctxTimeout, &acl.TransactRelationTuplesRequest{
		RelationTupleDeltas: []*acl.RelationTupleDelta{
			{
				Action: acl.RelationTupleDelta_ACTION_DELETE,
				RelationTuple: &acl.RelationTuple{
					Namespace: namespace,
					Object:    object,
					Relation:  relation,
					Subject:   &acl.Subject{Ref: &acl.Subject_Id{Id: subject}},
				},
			},
		},
	})
	if err != nil {
		slog.Error("Keto DeleteRelationship failed", "error", err)
		c.breaker.RecordFailure()
		return err
	}
	c.breaker.RecordSuccess()
	return nil
}

func (c *Client) ListRelationships(ctx context.Context, namespace, object, subject string) ([]*acl.RelationTuple, error) {
	if !c.breaker.Allow() {
		return nil, ErrServiceUnavailable
	}
	ctxTimeout, cancel := context.WithTimeout(ctx, 500*time.Millisecond)
	defer cancel()

	query := &acl.ListRelationTuplesRequest_Query{Namespace: namespace}
	if object != "" {
		query.Object = object
	}
	if subject != "" {
		query.Subject = &acl.Subject{Ref: &acl.Subject_Id{Id: subject}}
	}

	resp, err := c.readSvc.ListRelationTuples(ctxTimeout, &acl.ListRelationTuplesRequest{
		Query: query,
	})
	if err != nil {
		slog.Error("Keto ListRelationships failed", "error", err)
		c.breaker.RecordFailure()
		return nil, err
	}
	c.breaker.RecordSuccess()
	return resp.RelationTuples, nil
}
