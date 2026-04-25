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

func (c *Client) GetIdentity(ctx context.Context, id string) (*client.Identity, error) {
	log.Printf("KRATOS_OFFICIAL: Fetching identity %s", id)
	identity, _, err := c.api.IdentityAPI.GetIdentity(ctx, id).Execute()
	return identity, err
}

func (c *Client) ListIdentities(ctx context.Context) ([]client.Identity, error) {
	log.Printf("KRATOS_OFFICIAL: Listing all identities")
	identities, _, err := c.api.IdentityAPI.ListIdentities(ctx).Execute()
	return identities, err
}

func (c *Client) PatchIdentity(ctx context.Context, id string, patches []client.JsonPatch) error {
	log.Printf("KRATOS_OFFICIAL: Patching identity %s", id)
	_, _, err := c.api.IdentityAPI.PatchIdentity(ctx, id).JsonPatch(patches).Execute()
	return err
}

func (c *Client) ListSessions(ctx context.Context, id string) ([]client.Session, error) {
	log.Printf("KRATOS_OFFICIAL: Listing sessions for %s", id)
	sessions, _, err := c.api.IdentityAPI.ListIdentitySessions(ctx, id).Execute()
	return sessions, err
}

func (c *Client) RevokeSession(ctx context.Context, sid string) error {
	log.Printf("KRATOS_OFFICIAL: Revoking session %s", sid)
	_, err := c.api.IdentityAPI.DisableSession(ctx, sid).Execute()
	return err
}

func (c *Client) RevokeAllSessions(ctx context.Context, id string) error {
	log.Printf("KRATOS_OFFICIAL: Revoking ALL sessions for identity %s", id)
	_, err := c.api.IdentityAPI.DeleteIdentitySessions(ctx, id).Execute()
	return err
}

func (c *Client) CreateRecoveryLink(ctx context.Context, id string) (*client.RecoveryLinkForIdentity, error) {
	log.Printf("KRATOS_OFFICIAL: Creating recovery link for %s", id)
	req := c.api.IdentityAPI.CreateRecoveryLinkForIdentity(ctx)
	link, _, err := req.CreateRecoveryLinkForIdentityBody(client.CreateRecoveryLinkForIdentityBody{
		IdentityId: id,
	}).Execute()
	return link, err
}

func (c *Client) DeleteIdentity(ctx context.Context, id string) error {
	log.Printf("KRATOS_OFFICIAL: Deleting identity %s", id)
	_, err := c.api.IdentityAPI.DeleteIdentity(ctx, id).Execute()
	return err
}
