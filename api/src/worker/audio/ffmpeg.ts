import ffmpeg from 'fluent-ffmpeg';

export function runFFmpeg(
  inputPath: string,
  outputPath: string,
  filters: string[],
  outputOptions: string[] = [],
): Promise<void> {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath);

    if (filters.length > 0) {
      command = command.audioFilters(filters);
    }

    if (outputOptions.length > 0) {
      command = command.outputOptions(outputOptions);
    }

    command
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });
}
