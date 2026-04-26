package keto

import (
	"context"
	"errors"
	"log"
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

	log.Printf("KETO_INIT: gRPC Read: %s, Write: %s", readAddr, writeAddr)

	readConn, err := grpc.Dial(readAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Printf("KETO_ERROR: Dial Read failed: %v", err)
	}

	writeConn, err := grpc.Dial(writeAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Printf("KETO_ERROR: Dial Write failed: %v", err)
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
		log.Printf("KETO_ERROR: Check failed: %v", err)
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
		log.Printf("KETO_ERROR: CreateRelationship failed: %v", err)
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
		log.Printf("KETO_ERROR: DeleteRelationship failed: %v", err)
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
		log.Printf("KETO_ERROR: ListRelationships failed: %v", err)
		c.breaker.RecordFailure()
		return nil, err
	}
	c.breaker.RecordSuccess()
	return resp.RelationTuples, nil
}
