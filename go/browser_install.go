package autotok

// Downloading Chrome for Testing, for machines without Chrome.

import (
	"archive/zip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// ChromeForTestingURL lists the current Chrome for Testing builds.
const ChromeForTestingURL = "https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json"

// InstallOptions configure InstallBrowser.
type InstallOptions struct {
	// Progress, if set, is called as the download advances (total is -1 when unknown).
	Progress func(done, total int64)
}

// chromeForTestingPlatform is Chrome for Testing's name for this platform.
func chromeForTestingPlatform() (string, error) {
	switch runtime.GOOS + "/" + runtime.GOARCH {
	case "windows/amd64", "windows/arm64":
		return "win64", nil
	case "windows/386":
		return "win32", nil
	case "darwin/arm64":
		return "mac-arm64", nil
	case "darwin/amd64":
		return "mac-x64", nil
	case "linux/amd64":
		return "linux64", nil
	}
	return "", newConfigurationError(fmt.Sprintf("Chrome for Testing has no build for %s/%s. Install your distribution's "+
		"chromium package (e.g. apt install chromium) or set AUTOTOK_BROWSER_PATH", runtime.GOOS, runtime.GOARCH))
}

// InstallBrowser downloads the current stable Chrome for Testing (about 200 MB, once) into
// $AUTOTOK_HOME/browsers and returns the path of its executable. Nothing is downloaded when
// that version is already there.
func InstallBrowser(ctx context.Context, opts InstallOptions) (string, error) {
	platform, err := chromeForTestingPlatform()
	if err != nil {
		return "", err
	}
	// A plain client: a download may need the machine's usual HTTPS_PROXY.
	client := &http.Client{Transport: &http.Transport{Proxy: http.ProxyFromEnvironment}, Timeout: 30 * time.Minute}

	version, zipURL, err := latestChromeForTesting(ctx, client, platform)
	if err != nil {
		return "", err
	}
	dest := filepath.Join(browsersDir(), "chrome-"+version)
	if path := firstFile(executableIn(dest)); path != "" {
		return path, nil
	}
	if err := os.MkdirAll(browsersDir(), 0o755); err != nil {
		return "", err
	}
	logInfo("Downloading Chrome for Testing %s...", version)
	archive, err := os.CreateTemp(browsersDir(), ".download-*.zip")
	if err != nil {
		return "", err
	}
	defer os.Remove(archive.Name())
	err = download(ctx, client, zipURL, archive, opts.Progress)
	if cerr := archive.Close(); err == nil {
		err = cerr
	}
	if err != nil {
		return "", fmt.Errorf("downloading Chrome: %w", err)
	}

	staging, err := os.MkdirTemp(browsersDir(), ".unpack-")
	if err != nil {
		return "", err
	}
	defer os.RemoveAll(staging)
	if err := unzip(archive.Name(), staging); err != nil {
		return "", fmt.Errorf("unpacking Chrome: %w", err)
	}
	os.RemoveAll(dest)
	if err := os.Rename(staging, dest); err != nil {
		return "", err
	}
	path := firstFile(executableIn(dest))
	if path == "" {
		return "", fmt.Errorf("the Chrome download has no browser in it (looked in %s)", dest)
	}
	return path, nil
}

func latestChromeForTesting(ctx context.Context, client *http.Client, platform string) (version, url string, err error) {
	req, err := http.NewRequestWithContext(ctx, "GET", ChromeForTestingURL, nil)
	if err != nil {
		return "", "", err
	}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("could not list Chrome builds: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return "", "", fmt.Errorf("could not list Chrome builds: HTTP %d", resp.StatusCode)
	}
	var data struct {
		Channels map[string]struct {
			Version   string `json:"version"`
			Downloads map[string][]struct {
				Platform string `json:"platform"`
				URL      string `json:"url"`
			} `json:"downloads"`
		} `json:"channels"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return "", "", fmt.Errorf("could not list Chrome builds: %w", err)
	}
	stable := data.Channels["Stable"]
	for _, d := range stable.Downloads["chrome"] {
		if d.Platform == platform && stable.Version != "" {
			return stable.Version, d.URL, nil
		}
	}
	return "", "", fmt.Errorf("no stable Chrome for Testing build for %s", platform)
}

func download(ctx context.Context, client *http.Client, url string, w io.Writer, progress func(done, total int64)) error {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return err
	}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	total := resp.ContentLength
	var done int64
	buf := make([]byte, 256*1024)
	for {
		n, err := resp.Body.Read(buf)
		if n > 0 {
			if _, werr := w.Write(buf[:n]); werr != nil {
				return werr
			}
			done += int64(n)
			if progress != nil {
				progress(done, total)
			}
		}
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}
	}
}

// unzip extracts archive into dest, keeping file modes and symlinks (macOS app bundles have
// them) and refusing entries that would land outside dest: by their path, or by being written
// through a symlink the archive made (which could point anywhere), under it or in its place.
func unzip(archive, dest string) error {
	r, err := zip.OpenReader(archive)
	if err != nil {
		return err
	}
	defer r.Close()
	root, err := filepath.Abs(dest)
	if err != nil {
		return err
	}
	inside := func(path string) bool {
		rel, err := filepath.Rel(root, path)
		return err == nil && rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator)) && !filepath.IsAbs(rel)
	}
	links := map[string]bool{}
	underLink := func(path string) bool {
		for dir := filepath.Dir(path); dir != root && inside(dir); dir = filepath.Dir(dir) {
			if links[dir] {
				return true
			}
		}
		return false
	}
	for _, f := range r.File {
		target := filepath.Join(root, filepath.FromSlash(f.Name))
		if !inside(target) || underLink(target) || links[target] {
			return fmt.Errorf("unsafe path in archive: %s", f.Name)
		}
		mode := f.Mode()
		switch {
		case mode.IsDir():
			if err := os.MkdirAll(target, 0o755); err != nil {
				return err
			}
		case mode&os.ModeSymlink != 0:
			link, err := readZipFile(f)
			if err != nil {
				return err
			}
			resolved := filepath.Join(filepath.Dir(target), filepath.FromSlash(string(link)))
			if filepath.IsAbs(string(link)) || !inside(resolved) {
				return fmt.Errorf("unsafe link in archive: %s", f.Name)
			}
			if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
				return err
			}
			if err := os.Symlink(string(link), target); err != nil {
				return err
			}
			links[target] = true
		default:
			if err := extractFile(f, target, mode.Perm()|0o600); err != nil {
				return err
			}
		}
	}
	return nil
}

func readZipFile(f *zip.File) ([]byte, error) {
	rc, err := f.Open()
	if err != nil {
		return nil, err
	}
	defer rc.Close()
	return io.ReadAll(io.LimitReader(rc, 4096))
}

func extractFile(f *zip.File, target string, perm os.FileMode) error {
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		return err
	}
	rc, err := f.Open()
	if err != nil {
		return err
	}
	defer rc.Close()
	out, err := os.OpenFile(target, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, perm)
	if err != nil {
		return err
	}
	_, err = io.Copy(out, rc)
	if cerr := out.Close(); err == nil {
		err = cerr
	}
	return err
}
