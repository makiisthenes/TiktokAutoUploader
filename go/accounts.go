package autotok

// Saved TikTok sessions.
//
// Each account is one JSON file in $AUTOTOK_HOME/accounts/<name>.json holding the TikTok
// cookies, the user agent of the browser that logged in, and the account's proxy. It's the same
// file the Python and TypeScript packages read and write, so an account logged in with any of
// them works in all three. Files are written with 0600 permissions: a sessionid cookie is full
// access to the account.

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

const (
	// SessionCookie is TikTok's login cookie.
	SessionCookie = "sessionid"
	// DatacenterCookie tells TikTok which datacenter holds the account.
	DatacenterCookie = "tt-target-idc"
)

var accountNameRE = regexp.MustCompile(`^[A-Za-z0-9_.-]{1,128}$`)

// ValidateAccountName checks that name is usable as an account (and file) name: 1-128 letters,
// digits, '.', '_' or '-'.
func ValidateAccountName(name string) error {
	if !accountNameRE.MatchString(name) || name == "." || name == ".." {
		return newValidationError(fmt.Sprintf("invalid account name %q: use 1-128 letters, digits, '.', '_' or '-'", name))
	}
	return nil
}

// Cookie is a saved browser cookie. Name, Value, Domain and Path are what autotok uses; the
// rest of what the browser reported (expires, httpOnly, secure, sameSite...) is kept in Extra,
// exactly as saved, so files written by the other packages round-trip unchanged.
type Cookie struct {
	Name   string
	Value  string
	Domain string
	Path   string
	Extra  map[string]json.RawMessage
}

var cookieKnownFields = []string{"name", "value", "domain", "path"}

// MarshalJSON writes name, value, domain and path first, then the other fields.
func (c Cookie) MarshalJSON() ([]byte, error) {
	var b bytes.Buffer
	b.WriteByte('{')
	field := func(key string, raw []byte) {
		if b.Len() > 1 {
			b.WriteByte(',')
		}
		k, _ := json.Marshal(key)
		b.Write(k)
		b.WriteByte(':')
		b.Write(raw)
	}
	str := func(s string) []byte {
		raw, _ := marshalNoEscape(s)
		return raw
	}
	field("name", str(c.Name))
	field("value", str(c.Value))
	if c.Domain != "" {
		field("domain", str(c.Domain))
	}
	if c.Path != "" {
		field("path", str(c.Path))
	}
	keys := make([]string, 0, len(c.Extra))
	for k := range c.Extra {
		if !isCookieKnownField(k) {
			keys = append(keys, k)
		}
	}
	sort.Strings(keys)
	for _, k := range keys {
		field(k, c.Extra[k])
	}
	b.WriteByte('}')
	return b.Bytes(), nil
}

// UnmarshalJSON reads a cookie as any of the packages saved it.
func (c *Cookie) UnmarshalJSON(data []byte) error {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	text := func(key string) string {
		var s string
		if v, ok := raw[key]; ok && json.Unmarshal(v, &s) == nil {
			return s
		}
		if v, ok := raw[key]; ok && string(v) != "null" {
			return string(v)
		}
		return ""
	}
	*c = Cookie{Name: text("name"), Value: text("value"), Domain: text("domain"), Path: text("path")}
	for k, v := range raw {
		if !isCookieKnownField(k) {
			if c.Extra == nil {
				c.Extra = map[string]json.RawMessage{}
			}
			c.Extra[k] = v
		}
	}
	return nil
}

func isCookieKnownField(k string) bool {
	for _, f := range cookieKnownFields {
		if k == f {
			return true
		}
	}
	return false
}

func tiktokCookie(name, value string) Cookie {
	return Cookie{Name: name, Value: value, Domain: ".tiktok.com", Path: "/"}
}

// Account is a saved TikTok session.
type Account struct {
	Name    string
	Cookies []Cookie
	// UserAgent is the user agent of the browser that logged in ("" if unknown).
	UserAgent string
	// Proxy is the proxy URL, credentials included ("" for none).
	Proxy     string
	CreatedAt time.Time
	UpdatedAt time.Time
}

// accountFile is the on-disk format, shared with the other packages (hence snake_case).
type accountFile struct {
	Name      string   `json:"name"`
	Cookies   []Cookie `json:"cookies"`
	UserAgent *string  `json:"user_agent"`
	Proxy     *string  `json:"proxy"`
	CreatedAt string   `json:"created_at"`
	UpdatedAt string   `json:"updated_at"`
}

// isoTime is Python's datetime.isoformat(timespec="seconds") for UTC times:
// 2026-01-31T12:00:00+00:00.
func isoTime(t time.Time) string { return t.UTC().Format("2006-01-02T15:04:05-07:00") }

func parseISOTime(s string) time.Time {
	for _, layout := range []string{time.RFC3339Nano, "2006-01-02T15:04:05.999999", "2006-01-02T15:04:05"} {
		if t, err := time.Parse(layout, s); err == nil {
			return t
		}
	}
	return time.Time{}
}

// NewAccount builds an account. proxy may be any accepted proxy string ("" for none).
func NewAccount(name string, cookies []Cookie, userAgent, proxy string) (*Account, error) {
	if err := ValidateAccountName(name); err != nil {
		return nil, err
	}
	p, err := ParseProxy(proxy)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC().Truncate(time.Second)
	a := &Account{Name: name, Cookies: append([]Cookie(nil), cookies...), UserAgent: userAgent, CreatedAt: now, UpdatedAt: now}
	if p != nil {
		a.Proxy = p.URL()
	}
	return a, nil
}

// SessionAccountOptions are the optional parts of NewAccountFromSessionID.
type SessionAccountOptions struct {
	// Datacenter is the tt-target-idc cookie value. Without it, uploads assume useast2a.
	Datacenter string
	UserAgent  string
	Proxy      string
}

// NewAccountFromSessionID builds an account from a sessionid cookie copied out of a browser.
func NewAccountFromSessionID(name, sessionID string, opts SessionAccountOptions) (*Account, error) {
	sessionID = strings.TrimSpace(sessionID)
	if sessionID == "" {
		return nil, newValidationError("session id is empty")
	}
	cookies := []Cookie{tiktokCookie(SessionCookie, sessionID)}
	if dc := strings.TrimSpace(opts.Datacenter); dc != "" {
		cookies = append(cookies, tiktokCookie(DatacenterCookie, dc))
	}
	return NewAccount(name, cookies, opts.UserAgent, opts.Proxy)
}

// Cookie returns the value of the cookie called name ("" if there is none).
func (a *Account) Cookie(name string) string {
	for _, c := range a.Cookies {
		if c.Name == name && c.Value != "" {
			return c.Value
		}
	}
	return ""
}

// SessionID is the sessionid cookie ("" if not logged in).
func (a *Account) SessionID() string { return a.Cookie(SessionCookie) }

// Datacenter is the tt-target-idc cookie ("" if unknown).
func (a *Account) Datacenter() string { return a.Cookie(DatacenterCookie) }

// HasSession reports whether the account has a sessionid cookie.
func (a *Account) HasSession() bool { return a.SessionID() != "" }

// ParsedProxy is the account's proxy, or nil for none.
func (a *Account) ParsedProxy() (*Proxy, error) { return ParseProxy(a.Proxy) }

// String shows no cookies and masks the proxy password.
func (a *Account) String() string {
	proxy := "none"
	if p, err := a.ParsedProxy(); err == nil && p != nil {
		proxy = p.Masked()
	}
	return fmt.Sprintf("Account{name: %q, session: %t, proxy: %s}", a.Name, a.HasSession(), proxy)
}

// GoString keeps %#v from printing the session cookie.
func (a *Account) GoString() string { return a.String() }

func (a *Account) toFile() accountFile {
	f := accountFile{
		Name:      a.Name,
		Cookies:   a.Cookies,
		CreatedAt: isoTime(a.CreatedAt),
		UpdatedAt: isoTime(a.UpdatedAt),
	}
	if f.Cookies == nil {
		f.Cookies = []Cookie{}
	}
	if a.UserAgent != "" {
		f.UserAgent = &a.UserAgent
	}
	if a.Proxy != "" {
		f.Proxy = &a.Proxy
	}
	return f
}

func accountFromFile(f accountFile) (*Account, error) {
	if f.Name == "" {
		return nil, errors.New("missing account name")
	}
	if err := ValidateAccountName(f.Name); err != nil {
		return nil, err
	}
	a := &Account{Name: f.Name, Cookies: f.Cookies}
	if f.UserAgent != nil {
		a.UserAgent = *f.UserAgent
	}
	if f.Proxy != nil {
		p, err := ParseProxy(*f.Proxy)
		if err != nil {
			return nil, err
		}
		if p != nil {
			a.Proxy = p.URL()
		}
	}
	now := time.Now().UTC().Truncate(time.Second)
	if a.CreatedAt = parseISOTime(f.CreatedAt); a.CreatedAt.IsZero() {
		a.CreatedAt = now
	}
	if a.UpdatedAt = parseISOTime(f.UpdatedAt); a.UpdatedAt.IsZero() {
		a.UpdatedAt = now
	}
	return a, nil
}

func marshalNoEscape(v any) ([]byte, error) {
	var b bytes.Buffer
	enc := json.NewEncoder(&b)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	return bytes.TrimRight(b.Bytes(), "\n"), nil
}

// AccountStore reads and writes saved accounts in a folder.
type AccountStore struct {
	Root string
}

// NewAccountStore returns the store in root, or in AccountsDir() when root is "".
func NewAccountStore(root string) *AccountStore {
	if root == "" {
		root = AccountsDir()
	}
	return &AccountStore{Root: root}
}

func (s *AccountStore) root() string {
	if s == nil || s.Root == "" {
		return AccountsDir()
	}
	return s.Root
}

// Path is the file the account called name is saved in.
func (s *AccountStore) Path(name string) (string, error) {
	if err := ValidateAccountName(name); err != nil {
		return "", err
	}
	return filepath.Join(s.root(), name+".json"), nil
}

// Exists reports whether an account called name is saved.
func (s *AccountStore) Exists(name string) bool {
	path, err := s.Path(name)
	if err != nil {
		return false
	}
	info, err := os.Stat(path)
	return err == nil && info.Mode().IsRegular()
}

// Load reads the account called name.
func (s *AccountStore) Load(name string) (*Account, error) {
	path, err := s.Path(name)
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(path)
	if errors.Is(err, fs.ErrNotExist) {
		if legacy := legacySessionPath(name); legacy != "" {
			// 1.x saved sessions as Python pickles; the Python package migrates them.
			return nil, &AccountNotFoundError{baseError{msg: fmt.Sprintf(
				"'%s' has a TiktokAutoUploader 1.x session in %s, which this Go build can't read. Run the Python "+
					"autotok once (e.g. autotok accounts list) to migrate it, or log in again: autotok login -n %s",
				name, legacy, name)}}
		}
		return nil, &AccountNotFoundError{baseError{msg: fmt.Sprintf(
			"no saved session for '%s' in %s. Log in first: autotok login -n %s", name, s.root(), name)}}
	}
	if err != nil {
		return nil, err
	}
	var f accountFile
	data = bytes.TrimPrefix(data, []byte(utf8BOM))
	err = json.Unmarshal(data, &f)
	var a *Account
	if err == nil {
		a, err = accountFromFile(f)
	}
	if err != nil {
		return nil, &ValidationError{baseError{msg: fmt.Sprintf("account file %s is unreadable (%v); log in again", path, err), cause: err}}
	}
	return a, nil
}

// legacySessionPath is where TiktokAutoUploader 1.x saved the session called name, if it's
// there: CookiesDir/tiktok_session-<name>.cookie in the current folder.
func legacySessionPath(name string) string {
	path, err := filepath.Abs(filepath.Join("CookiesDir", "tiktok_session-"+name+".cookie"))
	if err != nil || !isFile(path) {
		return ""
	}
	return path
}

// Save writes the account (atomically, with 0600 permissions) and returns the file's path.
func (s *AccountStore) Save(a *Account) (string, error) {
	path, err := s.Path(a.Name)
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(s.root(), 0o700); err != nil {
		return "", err
	}
	a.UpdatedAt = time.Now().UTC().Truncate(time.Second)
	if a.CreatedAt.IsZero() {
		a.CreatedAt = a.UpdatedAt
	}
	var b bytes.Buffer
	enc := json.NewEncoder(&b)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	if err := enc.Encode(a.toFile()); err != nil {
		return "", err
	}
	data := bytes.TrimRight(b.Bytes(), "\n")

	suffix := make([]byte, 6)
	rand.Read(suffix)
	tmp := filepath.Join(s.root(), ".tmp-"+hex.EncodeToString(suffix))
	f, err := os.OpenFile(tmp, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return "", err
	}
	_, err = f.Write(data)
	if cerr := f.Close(); err == nil {
		err = cerr
	}
	if err == nil {
		err = os.Chmod(tmp, 0o600)
	}
	if err == nil {
		err = os.Rename(tmp, path)
	}
	if err != nil {
		os.Remove(tmp)
		return "", err
	}
	return path, nil
}

// Delete removes the saved account and reports whether there was one.
func (s *AccountStore) Delete(name string) (bool, error) {
	path, err := s.Path(name)
	if err != nil {
		return false, err
	}
	err = os.Remove(path)
	if errors.Is(err, fs.ErrNotExist) {
		return false, nil
	}
	return err == nil, err
}

// List returns the names of every saved account, sorted.
func (s *AccountStore) List() ([]string, error) {
	entries, err := os.ReadDir(s.root())
	if errors.Is(err, fs.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var names []string
	for _, e := range entries {
		name, ok := strings.CutSuffix(e.Name(), ".json")
		if ok && accountNameRE.MatchString(name) {
			names = append(names, name)
		}
	}
	sort.Strings(names)
	return names, nil
}

// SetProxy saves proxy as the account's proxy ("" to go direct).
func (s *AccountStore) SetProxy(name, proxy string) (*Account, error) {
	a, err := s.Load(name)
	if err != nil {
		return nil, err
	}
	p, err := ParseProxy(proxy)
	if err != nil {
		return nil, err
	}
	a.Proxy = ""
	if p != nil {
		a.Proxy = p.URL()
	}
	if _, err := s.Save(a); err != nil {
		return nil, err
	}
	return a, nil
}
