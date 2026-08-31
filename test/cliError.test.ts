import { describe, it, expect } from 'vitest';
import { CliError, toCliExit } from '../src/errors/cliError.js';
import { CLI_EXIT_CODE } from '../src/cli/types.js';

describe('CliError', () => {
  it('should be an Error with default RUNTIME_ERROR exit code', () => {
    const err = new CliError('boom');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('CliError');
    expect(err.message).toBe('boom');
    expect(err.exitCode).toBe(CLI_EXIT_CODE.RUNTIME_ERROR);
  });

  it('should accept a custom exit code', () => {
    const err = new CliError('missing config', CLI_EXIT_CODE.CONFIG_ERROR);
    expect(err.exitCode).toBe(CLI_EXIT_CODE.CONFIG_ERROR);
  });
});

describe('toCliExit', () => {
  it('should use CliError message and exit code', () => {
    const { message, code } = toCliExit(new CliError('bad args', CLI_EXIT_CODE.INVALID_ARGUMENT));
    expect(message).toBe('bad args');
    expect(code).toBe(CLI_EXIT_CODE.INVALID_ARGUMENT);
  });

  it('should map a plain Error to message and RUNTIME_ERROR', () => {
    const { message, code } = toCliExit(new Error('generic failure'));
    expect(message).toBe('generic failure');
    expect(code).toBe(CLI_EXIT_CODE.RUNTIME_ERROR);
  });

  it('should stringify non-Error values', () => {
    expect(toCliExit('oops').message).toBe('oops');
    expect(toCliExit('oops').code).toBe(CLI_EXIT_CODE.RUNTIME_ERROR);
  });
});
