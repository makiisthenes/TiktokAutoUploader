<?php

// Stands in for autotok in the tests: saves its arguments and stdin as JSON to $FAKE_AUTOTOK_ARGS,
// prints $FAKE_AUTOTOK_STDOUT and $FAKE_AUTOTOK_STDERR, and exits with $FAKE_AUTOTOK_EXIT.

$args = array_slice($argv, 1);
$args[] = 'stdin:' . stream_get_contents(STDIN);
file_put_contents((string) getenv('FAKE_AUTOTOK_ARGS'), json_encode($args));
fwrite(STDERR, (string) getenv('FAKE_AUTOTOK_STDERR'));
echo getenv('FAKE_AUTOTOK_STDOUT');
exit((int) getenv('FAKE_AUTOTOK_EXIT'));
