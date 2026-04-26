package keto

import (
	"context"
	"errors"
	"log"
	"time"
	"sync"

	client "github.com/ory/keto-client-go"
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
			// Half-open: try again
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
	readAPI  *client.APIClient
	writeAPI *client.APIClient
	breaker  *CircuitBreaker
}

func NewClient(readURL, writeURL string) *Client {
	readCfg := client.NewConfiguration()
	readCfg.Servers = client.ServerConfigurations{{URL: readURL}}
	
	writeCfg := client.NewConfiguration()
	writeCfg.Servers = client.ServerConfigurations{{URL: writeURL}}

	return &Client{
		readAPI:  client.NewAPIClient(readCfg),
		writeAPI: client.NewAPIClient(writeCfg),
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

	// Apply 500ms timeout explicitly as per specification
	ctxTimeout, cancel := context.WithTimeout(ctx, 500*time.Millisecond)
	defer cancel()

	log.Printf("KETO_AUTHZ: Checking if %s is %s on %s:%s", subject, relation, namespace, object)

	req := c.readAPI.PermissionApi.CheckPermission(ctxTimeout).
		Namespace(namespace).
		Object(object).
		Relation(relation).
		SubjectId(subject)

	resp, _, err := req.Execute()
	if err != nil {
		log.Printf("KETO_ERROR: CheckPermission failed: %v", err)
		c.breaker.RecordFailure()
		return false, err
	}

	c.breaker.RecordSuccess()
	return resp.GetAllowed(), nil
}

func (c *Client) CreateRelationship(ctx context.Context, namespace, object, relation, subject string) error {
	if !c.breaker.Allow() {
		return ErrServiceUnavailable
	}

	// Apply 500ms timeout
	ctxTimeout, cancel := context.WithTimeout(ctx, 500*time.Millisecond)
	defer cancel()

	log.Printf("KETO_AUTHZ: Creating relationship %s -> %s -> %s:%s", subject, relation, namespace, object)

	body := client.CreateRelationshipBody{
		Namespace: &namespace,
		Object:    &object,
		Relation:  &relation,
		SubjectId: &subject,
	}

	_, _, err := c.writeAPI.RelationshipApi.CreateRelationship(ctxTimeout).CreateRelationshipBody(body).Execute()
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

	// Apply 500ms timeout
	ctxTimeout, cancel := context.WithTimeout(ctx, 500*time.Millisecond)
	defer cancel()

	log.Printf("KETO_AUTHZ: Deleting relationship %s -> %s -> %s:%s", subject, relation, namespace, object)

	req := c.writeAPI.RelationshipApi.DeleteRelationships(ctxTimeout).
		Namespace(namespace).
		Object(object).
		Relation(relation).
		SubjectId(subject)

	_, err := req.Execute()
	if err != nil {
		log.Printf("KETO_ERROR: DeleteRelationship failed: %v", err)
		c.breaker.RecordFailure()
		return err
	}

	c.breaker.RecordSuccess()
	return nil
}

func (c *Client) ListRelationships(ctx context.Context, namespace, relation, subject string) ([]client.Relationship, error) {
	if !c.breaker.Allow() {
		return nil, ErrServiceUnavailable
	}

	ctxTimeout, cancel := context.WithTimeout(ctx, 500*time.Millisecond)
	defer cancel()

	log.Printf("KETO_AUTHZ: Listing relationships for %s -> %s -> %s", subject, relation, namespace)

	req := c.readAPI.RelationshipApi.GetRelationships(ctxTimeout).
		Namespace(namespace).
		Relation(relation).
		SubjectId(subject)

	resp, _, err := req.Execute()
	if err != nil {
		log.Printf("KETO_ERROR: GetRelationships failed: %v", err)
		c.breaker.RecordFailure()
		return nil, err
	}

	c.breaker.RecordSuccess()
	
	if resp.RelationTuples == nil {
		return []client.Relationship{}, nil
	}
	return resp.RelationTuples, nil
}
