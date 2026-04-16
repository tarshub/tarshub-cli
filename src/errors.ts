/**
 * User-facing CLI error. The message is printed to stderr and the process
 * exits with `exitCode`. Using a typed error instead of calling process.exit()
 * directly inside commands makes the logic unit-testable.
 */
export class CliError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number = 1,
  ) {
    super(message);
    this.name = "CliError";
  }
}
