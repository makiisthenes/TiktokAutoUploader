package io.github.makiisthenes.autotok;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Stands in for autotok in the tests: saves its process id to $FAKE_AUTOTOK_ARGS.pid, then its
 * arguments and "stdin:" and its input to $FAKE_AUTOTOK_ARGS (separated by NUL characters), sleeps
 * $FAKE_AUTOTOK_SLEEP milliseconds, prints $FAKE_AUTOTOK_STDOUT and $FAKE_AUTOTOK_STDERR, and exits
 * with $FAKE_AUTOTOK_EXIT. With FAKE_AUTOTOK_READ_STDIN=0 it never reads its input.
 */
public final class FakeAutotok {
    private FakeAutotok() {}

    public static void main(String[] args) throws Exception {
        String argsFile = System.getenv("FAKE_AUTOTOK_ARGS");
        Files.writeString(Path.of(argsFile + ".pid"), String.valueOf(ProcessHandle.current().pid()));
        String input = "0".equals(System.getenv("FAKE_AUTOTOK_READ_STDIN"))
                ? "(not read)"
                : new String(System.in.readAllBytes(), StandardCharsets.UTF_8);
        Files.writeString(Path.of(argsFile),
                String.join("\0", args) + "\0stdin:" + input, StandardCharsets.UTF_8);
        Thread.sleep(Long.parseLong(System.getenv().getOrDefault("FAKE_AUTOTOK_SLEEP", "0")));
        System.err.print(System.getenv("FAKE_AUTOTOK_STDERR"));
        System.err.flush();
        System.out.print(System.getenv("FAKE_AUTOTOK_STDOUT"));
        System.out.flush();
        System.exit(Integer.parseInt(System.getenv("FAKE_AUTOTOK_EXIT")));
    }
}
