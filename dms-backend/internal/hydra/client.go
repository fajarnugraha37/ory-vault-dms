package hydra

import (
	"context"
	"net/http"
	"strings"

	client "github.com/ory/hydra-client-go/v2"
)

type Client struct {
	api *client.APIClient
}

func NewClient(adminURL string) *Client {
	// Ensure URL format is correct for the client
	adminURL = strings.TrimSuffix(adminURL, "/")
	
	cfg := client.NewConfiguration()
	cfg.Servers = client.ServerConfigurations{
		{
			URL: adminURL,
		},
	}
	// Note: In docker internal network, we might need a custom HTTP client 
	// if we were using TLS with internal CAs, but Hydra admin is usually plain HTTP internally.
	cfg.HTTPClient = &http.Client{}

	return &Client{
		api: client.NewAPIClient(cfg),
	}
}

func (c *Client) GetLoginRequest(ctx context.Context, challenge string) (*client.OAuth2LoginRequest, error) {
	req := c.api.OAuth2API.GetOAuth2LoginRequest(ctx).LoginChallenge(challenge)
	res, _, err := req.Execute()
	return res, err
}

func (c *Client) AcceptLoginRequest(ctx context.Context, challenge string, subject string) (*client.OAuth2RedirectTo, error) {
	body := client.NewAcceptOAuth2LoginRequest(subject)
	req := c.api.OAuth2API.AcceptOAuth2LoginRequest(ctx).LoginChallenge(challenge).AcceptOAuth2LoginRequest(*body)
	res, _, err := req.Execute()
	return res, err
}

func (c *Client) GetConsentRequest(ctx context.Context, challenge string) (*client.OAuth2ConsentRequest, error) {
	req := c.api.OAuth2API.GetOAuth2ConsentRequest(ctx).ConsentChallenge(challenge)
	res, _, err := req.Execute()
	return res, err
}

func (c *Client) AcceptConsentRequest(ctx context.Context, challenge string, grantScopes []string, grantAudience []string) (*client.OAuth2RedirectTo, error) {
	body := client.NewAcceptOAuth2ConsentRequest()
	body.SetGrantScope(grantScopes)
	body.SetGrantAccessTokenAudience(grantAudience)
	
	req := c.api.OAuth2API.AcceptOAuth2ConsentRequest(ctx).ConsentChallenge(challenge).AcceptOAuth2ConsentRequest(*body)
	res, _, err := req.Execute()
	return res, err
}

func (c *Client) CreateOAuth2Client(ctx context.Context, clientData client.OAuth2Client) (*client.OAuth2Client, error) {
	req := c.api.OAuth2API.CreateOAuth2Client(ctx).OAuth2Client(clientData)
	res, _, err := req.Execute()
	return res, err
}

func (c *Client) GetOAuth2Client(ctx context.Context, id string) (*client.OAuth2Client, error) {
	req := c.api.OAuth2API.GetOAuth2Client(ctx, id)
	res, _, err := req.Execute()
	return res, err
}

func (c *Client) DeleteOAuth2Client(ctx context.Context, id string) error {
	req := c.api.OAuth2API.DeleteOAuth2Client(ctx, id)
	_, err := req.Execute()
	return err
}

func (c *Client) GetAPI() *client.APIClient {
	return c.api
}
