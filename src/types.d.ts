export {};

declare global {
  interface Window {
    internals: {
      argv: () => Promise<string[]>;
      cwd: () => Promise<string>;
      resolveSymlink: (text: string) => Promise<string>;
      allowedExtensions: () => Promise<{
        extensions: string[];
      }>;
      getFilename: (filepath: string) => Promise<string>;
      askFiles: () => Promise<string[] | undefined>;
      exit: () => Promise<void>;
      mergeAudio: (filename: string) => Promise<{
        title: string;
        duration: number;
        size: number;
        audioTracks: number[];
        is10bit: boolean;
        width: number;
        height: number;
        framerate: number;
      }>;
      reduceSize: (
        file: string,
        bitrate: number,
        audioTracks: number[],
        is10bit: boolean,
        width: number,
        height: number,
        framerate: number,
        bitrateratio?: number,
        speed?: number,
      ) => Promise<string>;
      moveMetadata: (file: string, nbTracks: number) => Promise<string>;
      confirmation: (text: string) => Promise<void>;
      wantedEncoder: (
        isFile10bit: boolean,
        dimensions: { width: number; height: number },
      ) => Promise<{
        codec: string;
        hw: boolean;
      }>;
      getArguments: () => Promise<{
        fileLimit: number;
        bitrateRatio: number;
        speed: number;
        forced: boolean;
      }>;
    };
  }
}
