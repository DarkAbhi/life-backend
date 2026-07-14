package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

const (
	sessionCookieName = "life_session"
	sessionLifetime   = 30 * 24 * time.Hour
)

type loginBody struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type sessionUser struct {
	ID       int64
	Username string
}

// Login verifies a username and password and creates a database-backed session.
// The session identifier is sent only as an HTTP-only cookie, not in the JSON body.
func (a *API) Login(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	defer r.Body.Close()

	var body loginBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		badRequest(w, "invalid JSON")
		return
	}

	username := strings.TrimSpace(body.Username)
	if username == "" || body.Password == "" {
		badRequest(w, "username and password are required")
		return
	}

	var userID int64
	var passwordHash string
	err := a.DB.QueryRow(
		`SELECT id, password_hash FROM users WHERE username = $1`,
		username,
	).Scan(&userID, &passwordHash)
	if errors.Is(err, sql.ErrNoRows) {
		unauthorized(w, "invalid username or password")
		return
	}
	if err != nil {
		serverError(w, err)
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(body.Password)) != nil {
		unauthorized(w, "invalid username or password")
		return
	}

	token, err := newSessionToken()
	if err != nil {
		serverError(w, err)
		return
	}

	expiresAt := time.Now().UTC().Add(sessionLifetime)
	hash := sha256.Sum256([]byte(token))
	if _, err := a.DB.Exec(
		`INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		userID,
		hex.EncodeToString(hash[:]),
		expiresAt,
	); err != nil {
		serverError(w, err)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   os.Getenv("APP_ENV") == "production",
	})
	writeJSON(w, http.StatusOK, map[string]string{"username": username})
}

// Session returns the signed-in user for a valid, non-expired session cookie.
// The browser uses this after a refresh instead of storing auth state itself.
func (a *API) Session(w http.ResponseWriter, r *http.Request) {
	user, err := a.sessionUser(r)
	if errors.Is(err, sql.ErrNoRows) {
		unauthorized(w, "session is invalid or expired")
		return
	}
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"username": user.Username})
}

func (a *API) sessionUser(r *http.Request) (sessionUser, error) {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil || cookie.Value == "" {
		return sessionUser{}, sql.ErrNoRows
	}

	hash := sha256.Sum256([]byte(cookie.Value))
	var user sessionUser
	err = a.DB.QueryRow(`
		SELECT users.id, users.username
		FROM user_sessions
		JOIN users ON users.id = user_sessions.user_id
		WHERE user_sessions.token_hash = $1 AND user_sessions.expires_at > NOW()
	`, hex.EncodeToString(hash[:])).Scan(&user.ID, &user.Username)
	return user, err
}

func newSessionToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
