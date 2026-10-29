package io.github.makiisthenes.autotok;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Stands in for autotok in the tests: saves its arguments and then "stdin:" and its input to
 * $FAKE_AUTOTOK_ARGS (separated by NUL characters), sleeps $FAKE_AUTOTOK_SLEEP milliseconds, prints
 * $FAKE_AUTOTOK_STDOUT and $FAKE_AUTOTOK_STDERR, and exits with $FAKE_AUTOTOK_EXIT.
 */
public final class FakeAutotok {
    private FakeAutotok() {}

    public static void main(String[] args) throws Exception {
        String input = new String(System.in.readAllBytes(), StandardCharsets.UTF_8);
        Files.writeString(Path.of(System.getenv("FAKE_AUTOTOK_ARGS")),
                String.join("\0", args) + "\0stdin:" + input, StandardCharsets.UTF_8);
        Thread.sleep(Long.parseLong(System.getenv().getOrDefault("FAKE_AUTOTOK_SLEEP", "0")));
        System.err.print(System.getenv("FAKE_AUTOTOK_STDERR"));
        System.err.flush();
        System.out.print(System.getenv("FAKE_AUTOTOK_STDOUT"));
        System.out.flush();
        System.exit(Integer.parseInt(System.getenv("FAKE_AUTOTOK_EXIT")));
    }
}
