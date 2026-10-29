<?php

declare(strict_types=1);

namespace Autotok;

use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;
use InvalidArgumentException;

/**
 * Uploads and schedules TikTok videos by running the autotok command line.
 *
 * autotok (the Python package, or the single Go binary) logs in, signs and uploads; this class
 * runs it with --json and turns its answers into PHP objects and exceptions. It uses the
 * accounts you logged in to with `autotok login`, and each account's saved proxy.
 *
 *     $autotok = new Autotok\Client();
 *     $result = $autotok->upload('alice', 'clip.mp4', 'Hello #fyp');
 *     echo $result->videoId;
 */
final class Client
{
    /** @var list<string> */
    private readonly array $command;

    /**
     * @param string|list<string> $command how to run autotok: a command name or path, or a
     *     command with arguments such as ['python3', '-m', 'autotok']. Default: autotok on PATH.
     * @param array<string, string> $env environment variables to set for autotok, such as
     *     AUTOTOK_HOME or AUTOTOK_BROWSER; the rest of the environment is passed on as it is.
     */
    public function __construct(string|array $command = 'autotok', private readonly array $env = [])
    {
        $command = is_string($command) ? [$command] : array_values($command);
        if ($command === []) {
            throw new InvalidArgumentException('command must not be empty');
        }
        $this->command = $command;
    }

    /**
     * Uploads a video and posts it now, or schedules it.
     *
     * Every upload is a real post. Uploads take a while (often a minute or more), so allow for
     * it in max_execution_time when this runs in a web request.
     *
     * @param string $account a saved account name (`autotok login -n NAME`)
     * @param string $video a file path, the name of a file in autotok's videos folder, or a
     *     YouTube link to download and upload (needs yt-dlp)
     * @param string $caption up to 2200 characters; #hashtags and @mentions become clickable
     * @param int|DateTimeInterface|null $schedule when TikTok should publish the video: seconds
     *     from now, or a time, 15 minutes to 30 days ahead (some accounts only allow 10 days).
     *     Null posts now.
     * @param string $visibility 'public' or 'private'
     * @param string|null $proxy a proxy for this upload instead of the account's saved one
     * @param bool $noProxy connect directly, ignoring the account's saved proxy
     *
     * @throws AutotokException
     */
    public function upload(
        string $account,
        string $video,
        string $caption,
        int|DateTimeInterface|null $schedule = null,
        string $visibility = 'public',
        bool $allowComment = true,
        bool $allowDuet = false,
        bool $allowStitch = false,
        bool $aiLabel = false,
        ?string $proxy = null,
        bool $noProxy = false,
    ): UploadResult {
        $visibilities = ['public' => '0', 'private' => '1'];
        if (!isset($visibilities[$visibility])) {
            throw new AutotokException("visibility must be 'public' or 'private'", 'ValidationError');
        }
        $source = preg_match('#^https?://#i', $video) ? "--youtube=$video" : "--video=$video";
        $args = [
            'upload', "--user=$account", $source, '--title-file=-',
            "--visibility={$visibilities[$visibility]}",
            '--comment=' . (int) $allowComment,
            '--duet=' . (int) $allowDuet,
            '--stitch=' . (int) $allowStitch,
            '--ailabel=' . (int) $aiLabel,
        ];
        if ($schedule !== null) {
            $args[] = '--schedule=' . self::scheduleSeconds($schedule);
        }
        if ($proxy !== null) {
            $args[] = "--proxy=$proxy";
        }
        if ($noProxy) {
            $args[] = '--no-proxy';
        }

        $data = $this->run($args, $caption);
        $scheduled = $data['scheduled_for'] ?? null;
        return new UploadResult(
            (string) $data['video_id'],
            (string) ($data['creation_id'] ?? ''),
            is_string($scheduled) ? new DateTimeImmutable($scheduled, new DateTimeZone('UTC')) : null,
        );
    }

    /**
     * The saved accounts.
     *
     * @return list<Account>
     *
     * @throws AutotokException
     */
    public function accounts(): array
    {
        $accounts = [];
        foreach ($this->run(['accounts', 'list'])['accounts'] ?? [] as $a) {
            $accounts[] = new Account(
                (string) $a['name'],
                (bool) ($a['session'] ?? false),
                isset($a['proxy']) ? (string) $a['proxy'] : null,
                isset($a['error']) ? (string) $a['error'] : null,
            );
        }
        return $accounts;
    }

    /**
     * Asks TikTok whether the account's saved session still works.
     *
     * @throws AutotokException
     */
    public function checkSession(string $account): bool
    {
        return (bool) ($this->run(['accounts', 'check', '--', $account])['session_ok'] ?? false);
    }

    /**
     * Deletes a saved account. Returns false if there was none.
     *
     * @throws AutotokException
     */
    public function removeAccount(string $account): bool
    {
        return (bool) ($this->run(['accounts', 'remove', '--', $account])['removed'] ?? false);
    }

    private static function scheduleSeconds(int|DateTimeInterface $schedule): int
    {
        if (is_int($schedule)) {
            return $schedule;
        }
        // Round up, so a time exactly 15 minutes ahead isn't turned into slightly less.
        $seconds = (int) ceil((float) $schedule->format('U.u') - microtime(true));
        if ($seconds <= 0) {
            throw new AutotokException('schedule is in the past', 'ValidationError');
        }
        return $seconds;
    }

    /**
     * Runs `autotok --json ARGS` and returns the JSON it printed.
     *
     * @param list<string> $args
     * @param string $input written to autotok's stdin. Captions go this way, not as arguments, so
     *     emoji arrive intact on every system.
     * @return array<string, mixed>
     */
    private function run(array $args, string $input = ''): array
    {
        $command = [...$this->command, '--json', ...$args];
        $env = $this->env === [] ? null : array_merge(getenv(), $this->env);
        $stderrFile = tmpfile(); // a file, not a pipe: autotok's log can't fill it up and block it
        $process = @proc_open($command, [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => $stderrFile], $pipes, null, $env);
        if (!is_resource($process)) {
            fclose($stderrFile);
            throw new AutotokException(self::notFound($command[0], error_get_last()['message'] ?? ''));
        }
        @fwrite($pipes[0], $input); // fails only if autotok already exited, which the output explains
        fclose($pipes[0]);
        $stdout = (string) stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        $exitCode = proc_close($process);
        rewind($stderrFile);
        $stderr = (string) stream_get_contents($stderrFile);
        fclose($stderrFile);

        $lines = preg_split('/\R/', trim($stdout)) ?: [];
        $data = json_decode((string) end($lines), true);
        if (is_array($data) && is_array($data['error'] ?? null)) {
            $e = $data['error'];
            throw new AutotokException(
                (string) ($e['message'] ?? 'autotok failed'),
                (string) ($e['type'] ?? 'Error'),
                (bool) ($e['retryable'] ?? false),
                isset($e['status_code']) ? (int) $e['status_code'] : null,
                isset($e['status_msg']) ? (string) $e['status_msg'] : null,
                isset($e['status']) ? (int) $e['status'] : null,
                $exitCode,
                $stderr,
            );
        }
        if (is_array($data)) {
            return $data;
        }

        // No JSON: autotok didn't start, or is a version without --json.
        if ($exitCode === 127) {
            $message = self::notFound($command[0], $stderr);
        } else {
            $lastLines = preg_split('/\R/', trim($stderr)) ?: [];
            $message = sprintf('autotok failed with exit status %d: %s', $exitCode, end($lastLines) ?: 'no output');
            if (str_contains($stderr, 'json')) {
                $message .= ' (This client needs an autotok version with the --json option: upgrade autotok.)';
            }
        }
        throw new AutotokException($message, exitCode: $exitCode, stderr: $stderr);
    }

    private static function notFound(string $program, string $detail): string
    {
        $message = "could not run $program: is autotok installed? Install it (see "
            . 'https://github.com/makiisthenes/TiktokAutoUploader#install) or pass its path to new Client().';
        return trim($detail) === '' ? $message : $message . ' (' . trim($detail) . ')';
    }
}
