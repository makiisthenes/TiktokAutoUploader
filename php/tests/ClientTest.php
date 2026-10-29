<?php

declare(strict_types=1);

namespace Autotok\Tests;

use Autotok\Account;
use Autotok\AutotokException;
use Autotok\Client;
use DateTimeImmutable;
use PHPUnit\Framework\TestCase;

final class ClientTest extends TestCase
{
    private string $argsFile;

    protected function setUp(): void
    {
        $this->argsFile = (string) tempnam(sys_get_temp_dir(), 'autotok-args');
    }

    protected function tearDown(): void
    {
        @unlink($this->argsFile);
    }

    /** A client whose autotok prints $stdout and exits with $exit. */
    private function fake(string $stdout, int $exit = 0, string $stderr = ''): Client
    {
        return new Client([PHP_BINARY, __DIR__ . '/fake-autotok.php'], [
            'FAKE_AUTOTOK_ARGS' => $this->argsFile,
            'FAKE_AUTOTOK_STDOUT' => $stdout,
            'FAKE_AUTOTOK_STDERR' => $stderr,
            'FAKE_AUTOTOK_EXIT' => (string) $exit,
        ]);
    }

    /** @return list<string> the arguments the fake autotok was run with, then "stdin:" and its input */
    private function args(): array
    {
        return json_decode((string) file_get_contents($this->argsFile), true);
    }

    public function testUploadWithTheDefaults(): void
    {
        $result = $this->fake("Uploading...\n" . '{"video_id": "7301", "creation_id": "c1", "scheduled_for": null}')
            ->upload('alice', 'clip.mp4', 'Hello #fyp');

        $this->assertSame('7301', $result->videoId);
        $this->assertSame('c1', $result->creationId);
        $this->assertNull($result->scheduledFor);
        $this->assertSame([
            '--json', 'upload', '--user=alice', '--video=clip.mp4', '--title-file=-',
            '--visibility=0', '--comment=1', '--duet=0', '--stitch=0', '--ailabel=0', 'stdin:Hello #fyp',
        ], $this->args());
    }

    public function testUploadWithEveryOption(): void
    {
        $caption = "-50% off 🎉\nsecond line \"quoted\" \$HOME";
        $result = $this->fake('{"video_id": "7302", "creation_id": "c2", "scheduled_for": "2026-11-02T18:30:00Z"}')
            ->upload('-dash', 'https://youtu.be/abc', $caption,
                schedule: new DateTimeImmutable('+2 hours'), visibility: 'private', allowComment: false,
                allowDuet: true, allowStitch: true, aiLabel: true, proxy: 'http://u:p@h.example:1', noProxy: true);

        $this->assertEquals(new DateTimeImmutable('2026-11-02T18:30:00Z'), $result->scheduledFor);
        $args = $this->args();
        $this->assertSame(['--json', 'upload', '--user=-dash', '--youtube=https://youtu.be/abc', '--title-file=-',
            '--visibility=1', '--comment=0', '--duet=1', '--stitch=1', '--ailabel=1'], array_slice($args, 0, 10));
        $this->assertMatchesRegularExpression('/^--schedule=(7199|7200|7201)$/', $args[10]);
        $this->assertSame(['--proxy=http://u:p@h.example:1', '--no-proxy', "stdin:$caption"], array_slice($args, 11));

        $this->fake('{"video_id": "1", "creation_id": "c"}')->upload('alice', 'clip.mp4', 'x', schedule: 3600);
        $this->assertContains('--schedule=3600', $this->args());
    }

    public function testMistakesAreCaughtBeforeRunningAutotok(): void
    {
        $client = $this->fake('{}');
        foreach ([
            fn () => $client->upload('alice', 'clip.mp4', 'x', visibility: 'friends'),
            fn () => $client->upload('alice', 'clip.mp4', 'x', schedule: new DateTimeImmutable('-1 minute')),
        ] as $call) {
            try {
                $call();
                $this->fail('no exception');
            } catch (AutotokException $e) {
                $this->assertSame('ValidationError', $e->type);
                $this->assertNull($e->exitCode);
            }
        }
        $this->assertSame('', file_get_contents($this->argsFile));
    }

    public function testErrorsBecomeExceptions(): void
    {
        $json = '{"error": {"type": "PublishError", "message": "TikTok rejected the post", "retryable": false,'
            . ' "status_code": 7, "status_msg": "guidelines"}}';
        try {
            $this->fake($json, 1, "log line\n")->upload('alice', 'clip.mp4', 'x');
            $this->fail('no exception');
        } catch (AutotokException $e) {
            $this->assertSame('TikTok rejected the post', $e->getMessage());
            $this->assertSame('PublishError', $e->type);
            $this->assertFalse($e->retryable);
            $this->assertSame(7, $e->statusCode);
            $this->assertSame('guidelines', $e->statusMsg);
            $this->assertSame(1, $e->exitCode);
            $this->assertSame("log line\n", $e->stderr);
            $this->assertFalse($e->isPublishUncertain());
        }

        try {
            $this->fake('{"error": {"type": "UploadError", "message": "HTTP 503", "retryable": true, "status": 503}}', 1)
                ->upload('alice', 'clip.mp4', 'x');
            $this->fail('no exception');
        } catch (AutotokException $e) {
            $this->assertTrue($e->retryable);
            $this->assertSame(503, $e->httpStatus);
        }

        try {
            $this->fake('{"error": {"type": "PublishUncertainError", "message": "lost", "retryable": false}}', 1)
                ->upload('alice', 'clip.mp4', 'x');
            $this->fail('no exception');
        } catch (AutotokException $e) {
            $this->assertTrue($e->isPublishUncertain());
        }
    }

    public function testAnAutotokWithoutJsonSupport(): void
    {
        $this->expectException(AutotokException::class);
        $this->expectExceptionMessage('exit status 2: autotok: error: unrecognized arguments: --json (This client needs');
        $this->fake('', 2, "usage: autotok ...\nautotok: error: unrecognized arguments: --json\n")->accounts();
    }

    public function testAMissingAutotok(): void
    {
        $this->expectException(AutotokException::class);
        $this->expectExceptionMessage('could not run /nonexistent/autotok: is autotok installed?');
        (new Client('/nonexistent/autotok'))->accounts();
    }

    public function testAccounts(): void
    {
        $accounts = $this->fake('{"accounts": [{"name": "alice", "session": true, "proxy": "http://u:****@h:1"},'
            . ' {"name": "broken", "session": false, "proxy": null, "error": "unreadable"}]}')->accounts();
        $this->assertEquals([
            new Account('alice', true, 'http://u:****@h:1'),
            new Account('broken', false, null, 'unreadable'),
        ], $accounts);
        $this->assertSame(['--json', 'accounts', 'list', 'stdin:'], $this->args());

        $this->assertFalse($this->fake('{"name": "alice", "session_ok": false}', 1)->checkSession('alice'));
        $this->assertSame(['--json', 'accounts', 'check', '--', 'alice', 'stdin:'], $this->args());
        $this->assertTrue($this->fake('{"name": "alice", "session_ok": true}')->checkSession('alice'));

        $this->assertTrue($this->fake('{"name": "-x", "removed": true}')->removeAccount('-x'));
        $this->assertSame(['--json', 'accounts', 'remove', '--', '-x', 'stdin:'], $this->args());
        $this->assertFalse($this->fake('{"name": "-x", "removed": false}', 1)->removeAccount('-x'));
    }

    /** Against a real autotok binary, when AUTOTOK_TEST_BIN is set (CI builds the Go one). */
    public function testWithTheRealAutotok(): void
    {
        $bin = getenv('AUTOTOK_TEST_BIN');
        if (!$bin) {
            $this->markTestSkipped('set AUTOTOK_TEST_BIN to an autotok binary to run this');
        }
        $home = sys_get_temp_dir() . '/autotok-php-' . bin2hex(random_bytes(4));
        $env = ['AUTOTOK_HOME' => $home, 'AUTOTOK_VIDEOS_DIR' => "$home/videos"];
        $client = new Client($bin, $env);
        $this->assertSame([], $client->accounts());

        exec(sprintf('AUTOTOK_HOME=%s %s login -n alice --sessionid s1 -p h.example:8000:user:secret',
            escapeshellarg($home), escapeshellarg($bin)), $out, $code);
        $this->assertSame(0, $code);
        $this->assertEquals([new Account('alice', true, 'http://user:****@h.example:8000')], $client->accounts());

        try {
            $client->upload('alice', 'missing.mp4', 'x');
            $this->fail('no exception');
        } catch (AutotokException $e) {
            $this->assertSame('ValidationError', $e->type);
            $this->assertSame(2, $e->exitCode);
        }
        mkdir("$home/videos");
        file_put_contents("$home/videos/clip.mp4", str_repeat("\0", 2048));
        try { // the caption reaches autotok (through stdin), which checks its length first
            $client->upload('alice', 'clip.mp4', str_repeat('🎉', 2201));
            $this->fail('no exception');
        } catch (AutotokException $e) {
            $this->assertSame('ValidationError', $e->type);
            $this->assertStringContainsString('2200', $e->getMessage());
        }
        try {
            $client->upload('ghost', 'missing.mp4', 'x');
            $this->fail('no exception');
        } catch (AutotokException $e) {
            $this->assertSame('AccountNotFoundError', $e->type);
            $this->assertStringContainsString('autotok login -n ghost', $e->getMessage());
        }
        $this->assertTrue($client->removeAccount('alice'));
        $this->assertFalse($client->removeAccount('alice'));
    }
}
