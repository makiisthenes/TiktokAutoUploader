// Stands in for autotok in the tests: saves its arguments and then "stdin:" and its input to
// $FAKE_AUTOTOK_ARGS (separated by NUL characters), sleeps $FAKE_AUTOTOK_SLEEP milliseconds,
// prints $FAKE_AUTOTOK_STDOUT and $FAKE_AUTOTOK_STDERR, and exits with $FAKE_AUTOTOK_EXIT.
using System;
using System.IO;
using System.Text;
using System.Threading;

var utf8 = new UTF8Encoding(false);
using var stdin = new StreamReader(Console.OpenStandardInput(), utf8);
var input = stdin.ReadToEnd();
File.WriteAllText(Env("FAKE_AUTOTOK_ARGS"), string.Join('\0', args) + "\0stdin:" + input, utf8);
Thread.Sleep(int.Parse(Env("FAKE_AUTOTOK_SLEEP", "0")));
Write(Console.OpenStandardError(), Env("FAKE_AUTOTOK_STDERR"));
Write(Console.OpenStandardOutput(), Env("FAKE_AUTOTOK_STDOUT"));
return int.Parse(Env("FAKE_AUTOTOK_EXIT", "0"));

static string Env(string name, string fallback = "") => Environment.GetEnvironmentVariable(name) ?? fallback;

static void Write(Stream stream, string text)
{
    var bytes = Encoding.UTF8.GetBytes(text);
    stream.Write(bytes);
    stream.Flush();
}
