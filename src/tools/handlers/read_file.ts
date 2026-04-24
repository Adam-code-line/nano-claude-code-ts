// read_file tool handler

type ReadFileInput = {
  file_path: string;
};

export async function readFileHandler(input: ReadFileInput): Promise<string> {
  const { file_path } = input;
  if (typeof file_path !== 'string' || !file_path.trim()) {
    throw new Error('read_file tool missing required parameter: file_path (string)');
  }

  const fs = await import('fs/promises');
  try {
    const data = await fs.readFile(file_path, 'utf8');
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`failed to read file: ${message}`);
  }
}
