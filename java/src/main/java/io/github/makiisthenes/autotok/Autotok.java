package io.github.makiisthenes.autotok;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.regex.Pattern;

/**
 * Uploads and schedules TikTok videos by running the autotok command line.
 *
 * <p>autotok (the Python package, or the single Go binary) logs in, signs and uploads; this class
 * runs it with {@code --json} and turns its answers into Java objects and exceptions. It uses the
 * accounts you logged in to with {@code autotok login}, and each account's saved proxy.
 *
 * <pre>{@code
 * Autotok autotok = new Autotok();
 * UploadResult result = autotok.upload("alice", "clip.mp4", "Hello #fyp");
 * System.out.println(result.videoId());
 * }</pre>
 *
 * <p>An Autotok object holds no state, so one can be shared between threads.
 */
public final class Autotok {
    private static final Pattern URL = Pattern.compile("^https?://", Pattern.CASE_INSENSITIVE);
    // How long a cancelled autotok gets to exit before it is killed.
    private static final Duration STOP_TIMEOUT = Duration.ofSeconds(5);
    // Write autotok's input and read its output, so the calling thread only waits for the process
    // and can be interrupted.
    private static final Executor READERS = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "autotok-output");
        t.setDaemon(true);
        return t;
    });

    private final List<String> command;
    private final Map<String, String> env;

    /** Runs {@code autotok} from the PATH. */
    public Autotok() {
        this(List.of("autotok"), Map.of());
    }

    /**
     * Runs autotok with this command.
     *
     * @param command a command name or path, or a command with arguments such as
     *     {@code List.of("python3", "-m", "autotok")}
     */
    public Autotok(List<String> command) {
        this(command, Map.of());
    }

    /**
     * Runs autotok with this command and these environment variables.
     *
     * @param command a command name or path, or a command with arguments
     * @param env environment variables to set for autotok, such as {@code AUTOTOK_HOME} or
     *     {@code AUTOTOK_BROWSER}; the rest of the environment is passed on as it is
     */
    public Autotok(List<String> command, Map<String, String> env) {
        if (command.isEmpty()) {
            throw new IllegalArgumentException("command must not be empty");
        }
        this.command = List.copyOf(command);
        this.env = Map.copyOf(env);
    }

    /**
     * Uploads a video and posts it now, publicly, with comments allowed.
     *
     * @see #upload(String, String, String, UploadOptions)
     */
    public UploadResult upload(String account, String video, String caption) {
        return upload(account, video, caption, new UploadOptions());
    }

    /**
     * Uploads a video and posts it now, or schedules it.
     *
     * <p>Every upload is a real post. Uploads take a while (often a minute or more); this method
     * blocks until TikTok has the post. Interrupting the thread (for example with
     * {@code Future.cancel(true)}) stops autotok and throws an {@link AutotokException} of type
     * {@code Cancelled}, after which the post may or may not exist.
     *
     * @param account a saved account name ({@code autotok login -n NAME})
     * @param video a file path, the name of a file in autotok's videos folder, or a YouTube link to
     *     download and upload (needs yt-dlp)
     * @param caption up to 2200 characters; #hashtags and @mentions become clickable
     * @param options when to publish, who can see the post, and its other settings
     * @throws AutotokException if autotok or TikTok reports an error
     */
    public UploadResult upload(String account, String video, String caption, UploadOptions options) {
        Objects.requireNonNull(options);
        List<String> args = new ArrayList<>(List.of(
                "upload",
                "--user=" + account,
                (URL.matcher(video).find() ? "--youtube=" : "--video=") + video,
                "--title-file=-",
                "--visibility=" + (options.visibility == Visibility.PRIVATE ? 1 : 0),
                "--comment=" + flag(options.allowComment),
                "--duet=" + flag(options.allowDuet),
                "--stitch=" + flag(options.allowStitch),
                "--ailabel=" + flag(options.aiLabel)));
        if (options.scheduleIn != null) {
            args.add("--schedule=" + ceilSeconds(options.scheduleIn));
        } else if (options.scheduleAt != null) {
            long seconds = ceilSeconds(Duration.between(Instant.now(), options.scheduleAt));
            if (seconds <= 0) {
                throw new AutotokException("schedule is in the past", "ValidationError");
            }
            args.add("--schedule=" + seconds);
        }
        if (options.proxy != null) {
            args.add("--proxy=" + options.proxy);
        }
        if (options.noProxy) {
            args.add("--no-proxy");
        }

        Map<String, Object> data = run(args, caption);
        Object scheduled = data.get("scheduled_for");
        return new UploadResult(
                String.valueOf(data.get("video_id")),
                String.valueOf(data.getOrDefault("creation_id", "")),
                scheduled instanceof String s ? Optional.of(Instant.parse(s)) : Optional.empty());
    }

    /** The saved accounts. */
    public List<Account> accounts() {
        List<Account> accounts = new ArrayList<>();
        Object list = run(List.of("accounts", "list"), "").get("accounts");
        if (list instanceof List<?> items) {
            for (Object item : items) {
                Map<?, ?> a = (Map<?, ?>) item;
                accounts.add(new Account(
                        String.valueOf(a.get("name")),
                        Boolean.TRUE.equals(a.get("session")),
                        Optional.ofNullable((String) a.get("proxy")),
                        Optional.ofNullable((String) a.get("error"))));
            }
        }
        return accounts;
    }

    /** Asks TikTok whether the account's saved session still works. */
    public boolean checkSession(String account) {
        return Boolean.TRUE.equals(run(List.of("accounts", "check", "--", account), "").get("session_ok"));
    }

    /** Deletes a saved account. Returns false if there was none. */
    public boolean removeAccount(String account) {
        return Boolean.TRUE.equals(run(List.of("accounts", "remove", "--", account), "").get("removed"));
    }

    private static int flag(boolean b) {
        return b ? 1 : 0;
    }

    /** Whole seconds, rounded up, so 15 minutes from now isn't turned into slightly less. */
    private static long ceilSeconds(Duration d) {
        return d.getSeconds() + (d.getNano() > 0 ? 1 : 0);
    }

    /**
     * Runs {@code autotok --json ARGS} with {@code input} on its stdin, and returns the JSON it
     * printed. Captions go through stdin as UTF-8: Java passes arguments in the system's encoding,
     * which turns emoji into '?' where that isn't UTF-8 (such as containers with no locale set).
     */
    private Map<String, Object> run(List<String> args, String input) {
        List<String> argv = new ArrayList<>(command);
        argv.add("--json");
        argv.addAll(args);
        ProcessBuilder builder = new ProcessBuilder(argv);
        builder.environment().putAll(env);
        Process process;
        try {
            process = builder.start();
        } catch (IOException e) {
            throw new AutotokException(notFound(command.get(0), e.getMessage()), "Error", e);
        }

        CompletableFuture<String> stdoutFuture = CompletableFuture.supplyAsync(() -> read(process.getInputStream()), READERS);
        CompletableFuture<String> stderrFuture = CompletableFuture.supplyAsync(() -> read(process.getErrorStream()), READERS);
        CompletableFuture.runAsync(() -> {
            try (var in = process.getOutputStream()) {
                in.write(input.getBytes(StandardCharsets.UTF_8));
            } catch (IOException e) {
                // autotok exited without reading it; its output says why
            }
        }, READERS);
        String stdout;
        String stderr;
        int exitCode;
        try {
            exitCode = process.waitFor();
            stdout = stdoutFuture.get();
            stderr = stderrFuture.get();
        } catch (InterruptedException e) {
            stop(process);
            Thread.currentThread().interrupt();
            throw new AutotokException("interrupted: if a video was being published, the post may or may not "
                    + "exist; check TikTok before trying again", "Cancelled", e);
        } catch (ExecutionException e) {
            stop(process);
            throw new AutotokException("could not read autotok's output: " + e.getCause().getMessage(), "Error",
                    e.getCause());
        }

        String[] lines = stdout.strip().split("\\R");
        Object parsed;
        try {
            parsed = Json.parse(lines[lines.length - 1]);
        } catch (IllegalArgumentException e) {
            parsed = null;
        }
        if (parsed instanceof Map<?, ?> map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) map;
            if (data.get("error") instanceof Map<?, ?> e) {
                throw new AutotokException(
                        String.valueOf(e.containsKey("message") ? e.get("message") : "autotok failed"),
                        e.get("type") instanceof String type ? type : "Error",
                        Boolean.TRUE.equals(e.get("retryable")),
                        integer(e.get("status_code")),
                        e.get("status_msg") instanceof String msg ? msg : null,
                        integer(e.get("status")),
                        exitCode,
                        stderr);
            }
            return data;
        }

        // No JSON: autotok didn't start, or is a version without --json.
        String message;
        if (exitCode == 127) {
            message = notFound(command.get(0), stderr);
        } else {
            String[] errLines = stderr.strip().split("\\R");
            String last = errLines[errLines.length - 1];
            message = "autotok failed with exit status " + exitCode + ": " + (last.isEmpty() ? "no output" : last);
            if (stderr.contains("json")) {
                message += " (This client needs an autotok version with the --json option: upgrade autotok.)";
            }
        }
        throw new AutotokException(message, "Error", false, null, null, null, exitCode, stderr);
    }

    /**
     * Stops autotok and what it started (the signing browser, for one): asks them to exit, waits up
     * to {@link #STOP_TIMEOUT}, then kills any that are still running.
     */
    private static void stop(Process process) {
        List<ProcessHandle> handles = new ArrayList<>(process.descendants().toList());
        handles.add(process.toHandle());
        handles.forEach(ProcessHandle::destroy);
        long deadline = System.nanoTime() + STOP_TIMEOUT.toNanos();
        try {
            for (ProcessHandle handle : handles) {
                handle.onExit().get(Math.max(0, deadline - System.nanoTime()), TimeUnit.NANOSECONDS);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (ExecutionException | TimeoutException e) {
            // killed below
        }
        handles.stream().filter(ProcessHandle::isAlive).forEach(ProcessHandle::destroyForcibly);
    }

    private static String read(InputStream in) {
        try (in) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static Integer integer(Object value) {
        return value instanceof Number n ? n.intValue() : null;
    }

    private static String notFound(String program, String detail) {
        String message = "could not run " + program + ": is autotok installed? Install it (see "
                + "https://github.com/makiisthenes/TiktokAutoUploader#install) or pass its path to new Autotok().";
        return detail == null || detail.isBlank() ? message : message + " (" + detail.strip() + ")";
    }
}
