package io.github.makiisthenes.autotok;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class AutotokTest {
    @TempDir
    Path tmp;

    /** An Autotok whose autotok prints {@code stdout} and exits with {@code exit}. */
    private Autotok fake(String stdout, int exit, String stderr) {
        return fake(stdout, exit, stderr, 0);
    }

    private Autotok fake(String stdout, int exit, String stderr, long sleepMillis) {
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        return new Autotok(
                List.of(java, "-cp", System.getProperty("java.class.path"), FakeAutotok.class.getName()),
                Map.of("FAKE_AUTOTOK_ARGS", tmp.resolve("args").toString(),
                        "FAKE_AUTOTOK_STDOUT", stdout,
                        "FAKE_AUTOTOK_STDERR", stderr,
                        "FAKE_AUTOTOK_EXIT", String.valueOf(exit),
                        "FAKE_AUTOTOK_SLEEP", String.valueOf(sleepMillis)));
    }

    private Autotok fake(String stdout) {
        return fake(stdout, 0, "");
    }

    /** The arguments the fake autotok was run with, then "stdin:" and its input. */
    private List<String> args() throws Exception {
        return Arrays.asList(Files.readString(tmp.resolve("args"), StandardCharsets.UTF_8).split("\0", -1));
    }

    @Test
    void uploadWithTheDefaults() throws Exception {
        UploadResult result = fake("Uploading...\n{\"video_id\": \"7301\", \"creation_id\": \"c1\", \"scheduled_for\": null}")
                .upload("alice", "clip.mp4", "Hello #fyp");
        assertEquals(new UploadResult("7301", "c1", Optional.empty()), result);
        assertEquals(List.of("--json", "upload", "--user=alice", "--video=clip.mp4", "--title-file=-",
                "--visibility=0", "--comment=1", "--duet=0", "--stitch=0", "--ailabel=0", "stdin:Hello #fyp"), args());
    }

    @Test
    void uploadWithEveryOption() throws Exception {
        String caption = "-50% off \uD83C\uDF89\nsecond line \"quoted\" $HOME";
        UploadResult result = fake("{\"video_id\":\"7302\",\"creation_id\":\"c2\",\"scheduled_for\":\"2026-11-02T18:30:00Z\"}")
                .upload("-dash", "https://youtu.be/abc", caption, new UploadOptions()
                        .schedule(Instant.now().plus(Duration.ofHours(2)))
                        .visibility(Visibility.PRIVATE)
                        .allowComment(false)
                        .allowDuet(true)
                        .allowStitch(true)
                        .aiLabel(true)
                        .proxy("http://u:p@h.example:1")
                        .noProxy());
        assertEquals(Optional.of(Instant.parse("2026-11-02T18:30:00Z")), result.scheduledFor());
        List<String> args = args();
        assertEquals(List.of("--json", "upload", "--user=-dash", "--youtube=https://youtu.be/abc", "--title-file=-",
                "--visibility=1", "--comment=0", "--duet=1", "--stitch=1", "--ailabel=1"), args.subList(0, 10));
        assertTrue(args.get(10).matches("--schedule=(7199|7200|7201)"), args.get(10));
        assertEquals(List.of("--proxy=http://u:p@h.example:1", "--no-proxy", "stdin:" + caption),
                args.subList(11, args.size()));

        fake("{\"video_id\": \"1\", \"creation_id\": \"c\"}")
                .upload("alice", "clip.mp4", "x", new UploadOptions().schedule(Duration.ofMinutes(60)));
        assertTrue(args().contains("--schedule=3600"));
    }

    @Test
    void aScheduleInThePastIsCaughtBeforeRunningAutotok() {
        AutotokException e = assertThrows(AutotokException.class, () -> fake("{}")
                .upload("alice", "clip.mp4", "x", new UploadOptions().schedule(Instant.now().minusSeconds(60))));
        assertEquals("ValidationError", e.type());
        assertEquals(Optional.empty(), e.exitCode());
        assertFalse(Files.exists(tmp.resolve("args")));
    }

    @Test
    void errorsBecomeExceptions() {
        AutotokException e = assertThrows(AutotokException.class, () -> fake(
                "{\"error\": {\"type\": \"PublishError\", \"message\": \"TikTok rejected the post\", \"retryable\": false,"
                        + " \"status_code\": 7, \"status_msg\": \"guidelines\"}}", 1, "log line\n")
                .upload("alice", "clip.mp4", "x"));
        assertEquals("TikTok rejected the post", e.getMessage());
        assertEquals("PublishError", e.type());
        assertFalse(e.retryable());
        assertEquals(Optional.of(7), e.statusCode());
        assertEquals(Optional.of("guidelines"), e.statusMsg());
        assertEquals(Optional.of(1), e.exitCode());
        assertTrue(e.stderr().endsWith("log line\n"), e.stderr()); // after any JVM notices
        assertFalse(e.isPublishUncertain());

        e = assertThrows(AutotokException.class, () -> fake(
                "{\"error\": {\"type\": \"UploadError\", \"message\": \"HTTP 503\", \"retryable\": true, \"status\": 503}}", 1, "")
                .upload("alice", "clip.mp4", "x"));
        assertTrue(e.retryable());
        assertEquals(Optional.of(503), e.httpStatus());

        e = assertThrows(AutotokException.class, () -> fake(
                "{\"error\": {\"type\": \"PublishUncertainError\", \"message\": \"lost\", \"retryable\": false}}", 1, "")
                .upload("alice", "clip.mp4", "x"));
        assertTrue(e.isPublishUncertain());
    }

    @Test
    void interruptingTheThreadStopsAutotok() throws Exception {
        Autotok autotok = fake("{\"video_id\": \"1\"}", 0, "", 60_000);
        AtomicReference<Throwable> thrown = new AtomicReference<>();
        Thread uploader = new Thread(() -> {
            try {
                autotok.upload("alice", "clip.mp4", "x");
            } catch (Throwable e) {
                thrown.set(e);
            }
        });
        long start = System.nanoTime();
        uploader.start();
        for (int i = 0; i < 100 && !Files.exists(tmp.resolve("args")); i++) {
            Thread.sleep(100); // until the fake autotok is running
        }
        uploader.interrupt();
        uploader.join(30_000);
        assertFalse(uploader.isAlive());
        assertTrue(Duration.ofNanos(System.nanoTime() - start).toSeconds() < 30);
        AutotokException e = assertInstanceOf(AutotokException.class, thrown.get());
        assertEquals("Cancelled", e.type());
        assertInstanceOf(InterruptedException.class, e.getCause());
    }

    @Test
    void anAutotokWithoutJsonSupport() {
        AutotokException e = assertThrows(AutotokException.class,
                () -> fake("", 2, "usage: autotok ...\nautotok: error: unrecognized arguments: --json\n").accounts());
        assertTrue(e.getMessage().startsWith(
                "autotok failed with exit status 2: autotok: error: unrecognized arguments: --json (This client needs"),
                e.getMessage());
    }

    @Test
    void aMissingAutotok() {
        AutotokException e = assertThrows(AutotokException.class,
                () -> new Autotok(List.of("/nonexistent/autotok")).accounts());
        assertTrue(e.getMessage().startsWith("could not run /nonexistent/autotok: is autotok installed?"), e.getMessage());
    }

    @Test
    void accounts() throws Exception {
        List<Account> accounts = fake("{\"accounts\": [{\"name\": \"alice\", \"session\": true, \"proxy\": \"http://u:****@h:1\"},"
                + " {\"name\": \"broken\", \"session\": false, \"proxy\": null, \"error\": \"unreadable\"}]}").accounts();
        assertEquals(List.of(
                new Account("alice", true, Optional.of("http://u:****@h:1"), Optional.empty()),
                new Account("broken", false, Optional.empty(), Optional.of("unreadable"))), accounts);
        assertEquals(List.of("--json", "accounts", "list", "stdin:"), args());

        assertFalse(fake("{\"name\": \"alice\", \"session_ok\": false}", 1, "").checkSession("alice"));
        assertEquals(List.of("--json", "accounts", "check", "--", "alice", "stdin:"), args());
        assertTrue(fake("{\"name\": \"alice\", \"session_ok\": true}").checkSession("alice"));

        assertTrue(fake("{\"name\": \"-x\", \"removed\": true}").removeAccount("-x"));
        assertEquals(List.of("--json", "accounts", "remove", "--", "-x", "stdin:"), args());
        assertFalse(fake("{\"name\": \"-x\", \"removed\": false}", 1, "").removeAccount("-x"));
    }

    @Test
    void json() {
        assertEquals(Map.of("a", List.of(1L, -2.5, true, false), "s", "é\"\\/\n\uD83C\uDF89", "n", 12345678901234L),
                Json.parse(" {\"a\": [1, -2.5, true, false], \"s\": \"\\u00e9\\\"\\\\\\/\\n\\ud83c\\udf89\", \"n\": 12345678901234} "));
        assertEquals(java.util.Collections.singletonMap("x", null), Json.parse("{\"x\":null}"));
        for (String bad : List.of("", "{", "{\"a\" 1}", "[1,]", "\"unterminated", "{} extra", "nul")) {
            assertThrows(IllegalArgumentException.class, () -> Json.parse(bad), bad);
        }
    }

    /** Against a real autotok binary, when AUTOTOK_TEST_BIN is set (CI builds the Go one). */
    @Test
    void withTheRealAutotok() throws Exception {
        String bin = System.getenv("AUTOTOK_TEST_BIN");
        org.junit.jupiter.api.Assumptions.assumeTrue(bin != null && !bin.isEmpty(),
                "set AUTOTOK_TEST_BIN to an autotok binary to run this");
        Map<String, String> env = Map.of("AUTOTOK_HOME", tmp.toString(),
                "AUTOTOK_VIDEOS_DIR", tmp.resolve("videos").toString());
        Autotok autotok = new Autotok(List.of(bin), env);
        assertEquals(List.of(), autotok.accounts());

        ProcessBuilder login = new ProcessBuilder(bin, "login", "-n", "alice", "--sessionid", "s1",
                "-p", "h.example:8000:user:secret").redirectOutput(new File(tmp.toFile(), "login.log"));
        login.environment().putAll(env);
        assertEquals(0, login.start().waitFor());
        assertEquals(List.of(new Account("alice", true, Optional.of("http://user:****@h.example:8000"), Optional.empty())),
                autotok.accounts());

        AutotokException e = assertThrows(AutotokException.class, () -> autotok.upload("alice", "missing.mp4", "x"));
        assertEquals("ValidationError", e.type());
        assertEquals(Optional.of(2), e.exitCode());
        Files.createDirectories(tmp.resolve("videos"));
        Files.write(tmp.resolve("videos").resolve("clip.mp4"), new byte[2048]);
        // The caption reaches autotok (through stdin), which checks its length first.
        e = assertThrows(AutotokException.class, () -> autotok.upload("alice", "clip.mp4", "\uD83C\uDF89".repeat(2201)));
        assertEquals("ValidationError", e.type());
        assertTrue(e.getMessage().contains("2200"), e.getMessage());
        e = assertThrows(AutotokException.class, () -> autotok.upload("ghost", "missing.mp4", "x"));
        assertEquals("AccountNotFoundError", e.type());
        assertTrue(e.getMessage().contains("autotok login -n ghost"), e.getMessage());
        assertTrue(autotok.removeAccount("alice"));
        assertFalse(autotok.removeAccount("alice"));
    }
}
