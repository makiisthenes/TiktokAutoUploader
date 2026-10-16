package autotok

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestParseEnvLikeThePythonPackage(t *testing.T) {
	got := ParseEnv(strings.Join([]string{
		"# comment",
		"",
		"A=1",
		"export B = two ",
		`C="quoted # not a comment"`,
		"D='single'",
		"E=value  # note",
		"F=tab\t# note",
		"bad line",
		"G=",
		"=nokey",
		"H-I=dash",
		"___=underscores",
	}, "\n"))
	want := map[string]string{"A": "1", "B": "two", "C": "quoted # not a comment", "D": "single", "E": "value", "F": "tab", "G": ""}
	if mustJSON(got) != mustJSON(want) {
		t.Errorf("got %v", got)
	}
}

func TestLoadEnvNeverOverridesSetVariables(t *testing.T) {
	home, _ := isolatedHome(t)
	path := filepath.Join(home, ".env")
	os.WriteFile(path, []byte(utf8BOM+"AUTOTOK_TEST_NEW=from-file\r\nAUTOTOK_TEST_SET=from-file\n"), 0o600)
	t.Setenv("AUTOTOK_TEST_SET", "from-env")
	t.Setenv("AUTOTOK_TEST_NEW", "")
	os.Unsetenv("AUTOTOK_TEST_NEW")
	if read := LoadEnv(path); len(read) != 1 || read[0] != path {
		t.Errorf("read %v", read)
	}
	if os.Getenv("AUTOTOK_TEST_NEW") != "from-file" || os.Getenv("AUTOTOK_TEST_SET") != "from-env" {
		t.Errorf("%q %q", os.Getenv("AUTOTOK_TEST_NEW"), os.Getenv("AUTOTOK_TEST_SET"))
	}
	if read := LoadEnv(filepath.Join(home, "missing.env")); len(read) != 0 {
		t.Error(read)
	}
}
