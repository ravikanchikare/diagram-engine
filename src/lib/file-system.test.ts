import { describe, expect, it } from 'vitest';
import { readExamplesDirectory } from './file-system';

function createFileHandle(name: string, source: string) {
  return {
    getFile: async () => ({
      text: async () => source,
    }),
    kind: 'file',
    name,
  } as unknown as FileSystemFileHandle & { kind: 'file'; name: string };
}

function createDirectoryHandle(
  name: string,
  entries: Array<FileSystemFileHandle | FileSystemDirectoryHandle>,
) {
  return {
    async *values() {
      for (const entry of entries) {
        yield entry;
      }
    },
    kind: 'directory',
    name,
  } as unknown as FileSystemDirectoryHandle & {
    kind: 'directory';
    name: string;
  };
}

describe('readExamplesDirectory', () => {
  it('treats the root diagram-theme.json as project theme metadata and filters to diagram files', async () => {
    const nestedDirectory = createDirectoryHandle('nested', [
      createFileHandle(
        'diagram-theme.json',
        JSON.stringify({
          type: 'diagram-theme',
          tokens: {},
        }),
      ),
      createFileHandle(
        'beta.json',
        JSON.stringify({
          type: 'state',
          description: 'Beta flow',
          size: 'medium',
          positioning: 'manual',
          elements: [],
        }),
      ),
      createFileHandle('notes.json', '{"hello":"world"}'),
    ]);
    const rootDirectory = createDirectoryHandle('project', [
      createFileHandle(
        'diagram-theme.json',
        JSON.stringify({
          type: 'diagram-theme',
          tokens: {
            light: {
              canvas: {
                gridColor: '#123456',
              },
            },
          },
        }),
      ),
      createFileHandle(
        'alpha.json',
        JSON.stringify({
          type: 'state',
          name: 'Alpha flow',
          description: 'Alpha flow',
          size: 'medium',
          positioning: 'manual',
          elements: [],
        }),
      ),
      createFileHandle('package.json', '{"name":"project"}'),
      nestedDirectory,
    ]);

    const directory = await readExamplesDirectory(rootDirectory);

    expect(directory.themeSource).toContain('"type":"diagram-theme"');
    expect(directory.files.map((file) => file.relativePath)).toEqual([
      'alpha.json',
      'nested/beta.json',
    ]);
    expect(directory.files[0]).toMatchObject({
      diagramName: 'Alpha flow',
      diagramType: 'state',
    });
    expect(directory.files[1]).toMatchObject({
      diagramName: undefined,
      diagramType: 'state',
    });
  });
});
