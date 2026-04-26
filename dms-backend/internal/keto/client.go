package keto

import (
	"context"
	"log"

	client "github.com/ory/keto-client-go"
)

type Client struct {
	readAPI  *client.APIClient
	writeAPI *client.APIClient
}

func NewClient(readURL, writeURL string) *Client {
	readCfg := client.NewConfiguration()
	readCfg.Servers = client.ServerConfigurations{{URL: readURL}}
	
	writeCfg := client.NewConfiguration()
	writeCfg.Servers = client.ServerConfigurations{{URL: writeURL}}

	return &Client{
		readAPI:  client.NewAPIClient(readCfg),
		writeAPI: client.NewAPIClient(writeCfg),
	}
}

func (c *Client) CheckPermission(ctx context.Context, namespace, object, relation, subject string) (bool, error) {
	log.Printf("KETO_AUTHZ: Checking if %s is %s on %s:%s", subject, relation, namespace, object)

	req := c.readAPI.PermissionApi.CheckPermission(ctx).
		Namespace(namespace).
		Object(object).
		Relation(relation).
		SubjectId(subject)

	resp, _, err := req.Execute()
	if err != nil {
		log.Printf("KETO_ERROR: CheckPermission failed: %v", err)
		return false, err
	}

	return resp.GetAllowed(), nil
}

func (c *Client) CreateRelationship(ctx context.Context, namespace, object, relation, subject string) error {
	log.Printf("KETO_AUTHZ: Creating relationship %s -> %s -> %s:%s", subject, relation, namespace, object)

	body := client.CreateRelationshipBody{
		Namespace: &namespace,
		Object:    &object,
		Relation:  &relation,
		SubjectId: &subject,
	}

	_, _, err := c.writeAPI.RelationshipApi.CreateRelationship(ctx).CreateRelationshipBody(body).Execute()
	if err != nil {
		log.Printf("KETO_ERROR: CreateRelationship failed: %v", err)
	}
	return err
}

func (c *Client) DeleteRelationship(ctx context.Context, namespace, object, relation, subject string) error {
	log.Printf("KETO_AUTHZ: Deleting relationship %s -> %s -> %s:%s", subject, relation, namespace, object)

	req := c.writeAPI.RelationshipApi.DeleteRelationships(ctx).
		Namespace(namespace).
		Object(object).
		Relation(relation).
		SubjectId(subject)

	_, err := req.Execute()
	if err != nil {
		log.Printf("KETO_ERROR: DeleteRelationship failed: %v", err)
	}
	return err
}
