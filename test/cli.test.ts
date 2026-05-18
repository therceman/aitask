import { parseArgs } from '../src/cli';

describe('parseArgs', () => {
  it('defaults to help when no command', () => {
    const result = parseArgs(['node', 'aitask']);
    expect(result.command).toBe('help');
  });

  it('parses help command', () => {
    const result = parseArgs(['node', 'aitask', 'help']);
    expect(result.command).toBe('help');
  });

  it('parses init command', () => {
    const result = parseArgs(['node', 'aitask', 'init']);
    expect(result.command).toBe('init');
  });

  it('parses init --force', () => {
    const result = parseArgs(['node', 'aitask', 'init', '--force']);
    expect(result.command).toBe('init');
    expect(result.flags).toEqual({ force: true });
  });

  it('parses init -f', () => {
    const result = parseArgs(['node', 'aitask', 'init', '-f']);
    expect(result.command).toBe('init');
    expect(result.flags).toEqual({ f: true, force: true });
  });

  it('parses create with title', () => {
    const result = parseArgs(['node', 'aitask', 'create', 'My task']);
    expect(result.command).toBe('create');
    expect(result.args).toEqual(['My task']);
  });

  it('parses create with flags', () => {
    const result = parseArgs(['node', 'aitask', 'create', 'Task', '--assign', 'bob']);
    expect(result.command).toBe('create');
    expect(result.args).toEqual(['Task']);
    expect(result.flags).toEqual({ assign: 'bob' });
  });

  it('parses publish with id', () => {
    const result = parseArgs(['node', 'aitask', 'publish', '1']);
    expect(result.command).toBe('publish');
    expect(result.args).toEqual(['1']);
  });

  it('parses publish with --dir', () => {
    const result = parseArgs(['node', 'aitask', 'publish', '3', '--dir', '/some/repo']);
    expect(result.command).toBe('publish');
    expect(result.args).toEqual(['3']);
    expect(result.flags).toEqual({ dir: '/some/repo' });
  });

  it('parses list', () => {
    const result = parseArgs(['node', 'aitask', 'list']);
    expect(result.command).toBe('list');
  });

  it('parses list --dir draft', () => {
    const result = parseArgs(['node', 'aitask', 'list', '--dir', 'draft']);
    expect(result.command).toBe('list');
    expect(result.flags).toEqual({ dir: 'draft' });
  });

  it('errors on unknown command', () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit'); }) as any);
    expect(() => parseArgs(['node', 'aitask', 'unknown'])).toThrow('exit');
    exitSpy.mockRestore();
  });
});
