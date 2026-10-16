package autotok

// Reading settings from .env files, the same way the Python and TypeScript packages do.
//
// LoadEnv reads ./.env, then $AUTOTOK_HOME/.env (~/.autotok/.env), and never overrides a
// variable that is already set. Nothing is loaded automatically: call it once at startup if you
// keep settings such as AUTOTOK_BROWSER or BROWSERBASE_API_KEY in a file. The command line
// does.

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"unicode"
)

var newlineRE = regexp.MustCompile(`\r\n|\r|\n`)

// utf8BOM is the byte order mark some editors put at the start of a file.
const utf8BOM = "\xef\xbb\xbf"

// ParseEnv parses KEY=value lines. It supports comments, `export KEY=...` and single or double
// quotes.
func ParseEnv(text string) map[string]string {
	values := map[string]string{}
	for _, raw := range newlineRE.Split(text, -1) {
		line := strings.TrimSpace(raw)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if strings.HasPrefix(line, "export ") {
			line = strings.TrimLeftFunc(line[len("export "):], unicode.IsSpace)
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		if !validEnvKey(key) {
			continue
		}
		value = strings.TrimSpace(value)
		if len(value) >= 2 && value[0] == value[len(value)-1] && (value[0] == '"' || value[0] == '\'') {
			value = value[1 : len(value)-1]
		} else {
			// Unquoted values end at an inline comment: KEY=value  # note
			for _, marker := range []string{" #", "\t#"} {
				if at := strings.Index(value, marker); at != -1 {
					value = strings.TrimRightFunc(value[:at], unicode.IsSpace)
				}
			}
		}
		values[key] = value
	}
	return values
}

// validEnvKey: letters, digits and underscores, with at least one letter or digit.
func validEnvKey(key string) bool {
	rest := strings.ReplaceAll(key, "_", "")
	if rest == "" {
		return false
	}
	for _, r := range rest {
		if !unicode.IsLetter(r) && !unicode.IsNumber(r) {
			return false
		}
	}
	return true
}

// LoadEnv loads .env files into the environment without overriding variables that are already
// set. With no arguments it reads ./.env, then $AUTOTOK_HOME/.env. It returns the files that
// were read.
func LoadEnv(paths ...string) []string {
	var read []string
	seen := map[string]bool{}
	load := func(path string) {
		info, err := os.Stat(path)
		if err != nil || !info.Mode().IsRegular() {
			return
		}
		real, err := filepath.EvalSymlinks(path)
		if err != nil {
			return
		}
		if abs, err := filepath.Abs(real); err == nil {
			real = abs
		}
		if seen[real] {
			return
		}
		seen[real] = true
		data, err := os.ReadFile(path)
		if err != nil {
			return
		}
		text := strings.TrimPrefix(string(data), utf8BOM)
		for key, value := range ParseEnv(text) {
			if _, set := os.LookupEnv(key); !set {
				os.Setenv(key, value)
			}
		}
		read = append(read, path)
	}
	if len(paths) == 0 {
		if abs, err := filepath.Abs(".env"); err == nil {
			load(abs)
		}
		// Evaluated after ./.env, which may set AUTOTOK_HOME.
		load(filepath.Join(Home(), ".env"))
		return read
	}
	for _, path := range paths {
		load(path)
	}
	return read
}
