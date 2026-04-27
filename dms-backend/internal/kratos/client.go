package kratos

import (
	"context"
	"log"

	client "github.com/ory/kratos-client-go"
)

type Client struct {
	api *client.APIClient
}

func NewClient(adminURL string) *Client {
	cfg := client.NewConfiguration()
	cfg.Servers = client.ServerConfigurations{{URL: adminURL}}
	return &Client{api: client.NewAPIClient(cfg)}
}

func (c *Client) GetAPI() *client.APIClient {
	return c.api
}

func (c *Client) GetIdentity(ctx context.Context, id string) (*client.Identity, error) {
	log.Printf("KRATOS_OFFICIAL: Fetching identity %s", id)
	identity, _, err := c.api.IdentityAPI.GetIdentity(ctx, id).Execute()
	return identity, err
}

func (c *Client) ListIdentities(ctx context.Context, pageSize int64, pageToken string) ([]client.Identity, string, error) {
	req := c.api.IdentityAPI.ListIdentities(ctx)
	if pageSize > 0 { req = req.PageSize(pageSize) }
	if pageToken != "" { req = req.PageToken(pageToken) }
	
	identities, resp, err := req.Execute()
	if err != nil { return nil, "", err }
	
	// Extract pagination from Header
	nextPage := ""
	if resp != nil {
		nextPage = resp.Header.Get("X-Next-Page-Token")
	}
	
	return identities, nextPage, nil
}

func (c *Client) CreateIdentityWithPassword(ctx context.Context, email, password, schema string, traits map[string]interface{}) (*client.Identity, error) {
	log.Printf("KRATOS_OFFICIAL: Seeding identity %s", email)
	if traits == nil { traits = make(map[string]interface{}) }
	traits["email"] = email

	body := client.CreateIdentityBody{
		SchemaId: schema,
		Traits:   traits,
		Credentials: &client.IdentityWithCredentials{
			Password: &client.IdentityWithCredentialsPassword{
				Config: &client.IdentityWithCredentialsPasswordConfig{
					Password: &password,
				},
			},
		},
	}

	identity, _, err := c.api.IdentityAPI.CreateIdentity(ctx).CreateIdentityBody(body).Execute()
	return identity, err
}

func (c *Client) PatchIdentity(ctx context.Context, id string, patches []client.JsonPatch) error {
	log.Printf("KRATOS_OFFICIAL: Patching identity %s", id)
	_, _, err := c.api.IdentityAPI.PatchIdentity(ctx, id).JsonPatch(patches).Execute()
	return err
}

func (c *Client) ListSessions(ctx context.Context, id string, pageSize int64, pageToken string) ([]client.Session, error) {
	req := c.api.IdentityAPI.ListIdentitySessions(ctx, id)
	if pageSize > 0 { req = req.PageSize(pageSize) }
	if pageToken != "" { req = req.PageToken(pageToken) }
	
	sessions, _, err := req.Execute()
	return sessions, err
}

func (c *Client) RevokeSession(ctx context.Context, sid string) error {
	_, err := c.api.IdentityAPI.DisableSession(ctx, sid).Execute()
	return err
}

func (c *Client) RevokeAllSessions(ctx context.Context, id string) error {
	_, err := c.api.IdentityAPI.DeleteIdentitySessions(ctx, id).Execute()
	return err
}

func (c *Client) CreateRecoveryLink(ctx context.Context, id string) (*client.RecoveryLinkForIdentity, error) {
	req := c.api.IdentityAPI.CreateRecoveryLinkForIdentity(ctx)
	link, _, err := req.CreateRecoveryLinkForIdentityBody(client.CreateRecoveryLinkForIdentityBody{
		IdentityId: id,
	}).Execute()
	return link, err
}

func (c *Client) DeleteIdentity(ctx context.Context, id string) error {
	_, err := c.api.IdentityAPI.DeleteIdentity(ctx, id).Execute()
	return err
}
