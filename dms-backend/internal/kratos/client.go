package kratos

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)

type Client struct {
	AdminURL string
}

func NewClient(adminURL string) *Client {
	return &Client{AdminURL: adminURL}
}

func (c *Client) GetIdentity(id string) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/admin/identities/%s", c.AdminURL, id)
	log.Printf("KRATOS_DEBUG: GET %s", url)
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	log.Printf("KRATOS_DEBUG: Response %d", resp.StatusCode)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("kratos returned %d", resp.StatusCode)
	}
	var identity map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&identity)
	return identity, nil
}

func (c *Client) PatchIdentity(id string, patch interface{}) (int, error) {
	url := fmt.Sprintf("%s/admin/identities/%s", c.AdminURL, id)
	patchJSON, _ := json.Marshal(patch)
	log.Printf("KRATOS_DEBUG: PATCH %s with %s", url, string(patchJSON))
	req, _ := http.NewRequest("PATCH", url, bytes.NewBuffer(patchJSON))
	req.Header.Set("Content-Type", "application/json-patch+json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 500, err
	}
	defer resp.Body.Close()
	log.Printf("KRATOS_DEBUG: Response %d", resp.StatusCode)
	return resp.StatusCode, nil
}

func (c *Client) ListIdentities() (json.RawMessage, error) {
	url := fmt.Sprintf("%s/admin/identities", c.AdminURL)
	log.Printf("KRATOS_DEBUG: GET %s", url)
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	log.Printf("KRATOS_DEBUG: Response %d", resp.StatusCode)
	body, _ := io.ReadAll(resp.Body)
	return body, nil
}

func (c *Client) ListSessions(id string) (json.RawMessage, error) {
	url := fmt.Sprintf("%s/admin/identities/%s/sessions", c.AdminURL, id)
	log.Printf("KRATOS_DEBUG: GET %s", url)
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	log.Printf("KRATOS_DEBUG: Response %d", resp.StatusCode)
	body, _ := io.ReadAll(resp.Body)
	return body, nil
}

func (c *Client) RevokeSession(id, sid string) (int, error) {
	url := fmt.Sprintf("%s/admin/sessions/%s", c.AdminURL, sid)
	log.Printf("KRATOS_DEBUG: DELETE %s", url)
	req, _ := http.NewRequest("DELETE", url, nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("KRATOS_ERROR: Failed to call Kratos: %v", err)
		return 500, err
	}
	defer resp.Body.Close()
	log.Printf("KRATOS_DEBUG: Response %d", resp.StatusCode)
	return resp.StatusCode, nil
}

func (c *Client) RevokeAllSessions(id string) (int, error) {
	url := fmt.Sprintf("%s/admin/identities/%s/sessions", c.AdminURL, id)
	log.Printf("KRATOS_DEBUG: DELETE %s", url)
	req, _ := http.NewRequest("DELETE", url, nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 500, err
	}
	defer resp.Body.Close()
	log.Printf("KRATOS_DEBUG: Response %d", resp.StatusCode)
	return resp.StatusCode, nil
}

func (c *Client) CreateRecoveryLink(id string) (json.RawMessage, error) {
	url := fmt.Sprintf("%s/admin/recovery/link", c.AdminURL)
	bodyJSON, _ := json.Marshal(map[string]string{"identity_id": id})
	log.Printf("KRATOS_DEBUG: POST %s with %s", url, string(bodyJSON))
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(bodyJSON))
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	log.Printf("KRATOS_DEBUG: Response %d", resp.StatusCode)
	resBody, _ := io.ReadAll(resp.Body)
	return resBody, nil
}

func (c *Client) DeleteIdentity(id string) (int, error) {
	url := fmt.Sprintf("%s/admin/identities/%s", c.AdminURL, id)
	log.Printf("KRATOS_DEBUG: DELETE %s", url)
	req, _ := http.NewRequest("DELETE", url, nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 500, err
	}
	defer resp.Body.Close()
	log.Printf("KRATOS_DEBUG: Response %d", resp.StatusCode)
	return resp.StatusCode, nil
}
