package autotok

// Logging. Warnings (e.g. a cloud login link to open, a mention that could not be resolved) go
// to standard error by default; debug and info messages are dropped. Pass your own
// *slog.Logger to SetLogger to route them elsewhere, or nil to silence everything.

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"strings"
	"sync"
	"sync/atomic"
)

var logger atomic.Pointer[slog.Logger]

func init() {
	logger.Store(slog.New(NewTextHandler(os.Stderr, slog.LevelWarn, "autotok: ")))
}

// SetLogger routes autotok's log messages to l. nil silences them.
func SetLogger(l *slog.Logger) {
	if l == nil {
		l = slog.New(slog.DiscardHandler)
	}
	logger.Store(l)
}

func logDebug(format string, args ...any) { logAt(slog.LevelDebug, format, args...) }
func logInfo(format string, args ...any)  { logAt(slog.LevelInfo, format, args...) }
func logWarn(format string, args ...any)  { logAt(slog.LevelWarn, format, args...) }

func logAt(level slog.Level, format string, args ...any) {
	l := logger.Load()
	if !l.Enabled(context.Background(), level) {
		return
	}
	l.Log(context.Background(), level, fmt.Sprintf(format, args...))
}

// NewTextHandler returns a slog.Handler that writes each message at level or above as one
// plain line, after prefix: what the command line prints.
func NewTextHandler(w io.Writer, level slog.Leveler, prefix string) slog.Handler {
	return &textHandler{w: w, level: level, prefix: prefix, mu: &sync.Mutex{}}
}

type textHandler struct {
	w      io.Writer
	level  slog.Leveler
	prefix string
	attrs  string
	mu     *sync.Mutex
}

func (h *textHandler) Enabled(_ context.Context, level slog.Level) bool {
	return level >= h.level.Level()
}

func (h *textHandler) Handle(_ context.Context, r slog.Record) error {
	var b strings.Builder
	b.WriteString(h.prefix)
	b.WriteString(r.Message)
	b.WriteString(h.attrs)
	r.Attrs(func(a slog.Attr) bool {
		fmt.Fprintf(&b, " %s=%v", a.Key, a.Value)
		return true
	})
	b.WriteByte('\n')
	h.mu.Lock()
	defer h.mu.Unlock()
	_, err := io.WriteString(h.w, b.String())
	return err
}

func (h *textHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	c := *h
	var b strings.Builder
	b.WriteString(h.attrs)
	for _, a := range attrs {
		fmt.Fprintf(&b, " %s=%v", a.Key, a.Value)
	}
	c.attrs = b.String()
	return &c
}

func (h *textHandler) WithGroup(string) slog.Handler { return h }
