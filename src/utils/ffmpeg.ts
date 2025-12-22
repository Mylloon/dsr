export namespace FFmpegArgument {
  /** Supported formats */
  export enum Formats {
    MP4 = "mp4",
  }

  /** Null devices */
  export enum SystemNULL {
    Windows = "NUL",
    Linux = "/dev/null",
  }

  export enum HardwareBackend {
    /** Use Nvidia card */
    Cuda = "cuda",
    /** Use AMD or Intel card on Windows */
    DirectX11 = "d3d11va",
    /** Use AMD or Intel card on Linux */
    VAAPI = "vaapi",
    /** Use Vulkan */
    Vulkan = "vulkan",
    /** Use Intel QSV */
    QSV = "qsv",
  }

  /** Available filters */
  export const VideoFilters = {
    /** YUV 4:2:0 = Useful when downgrading from 10 to 8 bits or for dumb players.
     *  See: https://trac.ffmpeg.org/wiki/Encode/H.264#Encodingfordumbplayers */
    PixelFormatYUV420: { default: "format=yuv420p" },
    /** Change the video dimensions */
    Scaler: (w: number, h: number) => ({
      [HardwareBackend.VAAPI]: `scale_vaapi=${w}:${h}`,
      default: `scale=${w}:${h}`,
    }),
    /** Change the video framerate */
    Framerate: (fps: number) => ({
      default: `fps=${fps}`,
    }),
  } as const;
  export type VideoFilters = { default: string } & Partial<
    Record<HardwareBackend, string>
  >;

  export namespace Codecs {
    export const Video = {
      Copy: {
        default: "copy",
      },
      /** https://trac.ffmpeg.org/wiki/Encode/H.264 */
      H264: {
        [HardwareBackend.Cuda]: "h264_nvenc",
        [HardwareBackend.DirectX11]: "h264_amf",
        [HardwareBackend.VAAPI]: "h264_vaapi",
        [HardwareBackend.Vulkan]: "h264_vulkan",
        [HardwareBackend.QSV]: "h264_qsv",
        default: "libx264",
      },
      /** https://trac.ffmpeg.org/wiki/Encode/H.265 */
      H265: {
        [HardwareBackend.Cuda]: "hevc_nvenc",
        [HardwareBackend.DirectX11]: "hevc_amf",
        [HardwareBackend.VAAPI]: "hevc_vaapi",
        [HardwareBackend.Vulkan]: "hevc_vulkan",
        [HardwareBackend.QSV]: "hevc_qsv",
        default: "libx265",
      },
      /** https://trac.ffmpeg.org/wiki/Encode/AV1 */
      AV1: {
        [HardwareBackend.Cuda]: "av1_nvenc",
        [HardwareBackend.DirectX11]: "av1_amf",
        [HardwareBackend.VAAPI]: "av1_vaapi",
        [HardwareBackend.Vulkan]: "av1_vulkan",
        [HardwareBackend.QSV]: "av1_qsv",
        default: "libaom-av1",
      },
      /** https://trac.ffmpeg.org/wiki/Encode/VP9 */
      VP9: {
        [HardwareBackend.VAAPI]: "vp9_vaapi",
        [HardwareBackend.QSV]: "vp9_qsv",
        default: "libvpx-vp9",
      },
    } as const;
    export type Video = { default: string } & Partial<
      Record<HardwareBackend, string>
    >;

    export enum Audio {
      /** https://en.wikipedia.org/wiki/Advanced_Audio_Coding */
      AAC = "aac",
      Copy = "copy",
    }
  }

  /** Stream definition */
  export interface Stream {
    /** Index of the stream, starting from 0 */
    streamIndex: number | null;
    /** Type of the stream */
    type: Stream.Type;
  }
  export namespace Stream {
    /** Internal possible types for a stream */
    enum Types {
      Audio = "audio",
      Video = "video",
    }

    /** Supported formats */
    export const Type = {
      Audio: { type: Types.Audio, prefix: Types.Audio.charAt(0) },
      Video: { type: Types.Video, prefix: Types.Video.charAt(0) },
    } as const;
    export type Type = (typeof Type)[keyof typeof Type];

    export enum Unit {
      Kb = "k",
    }

    export interface Bitrate {
      value: number;
      unit: Unit;
    }

    interface BitratePrintable extends Bitrate {
      toString(): string;
      /** Change the inner value */
      transform(fn: (value: Bitrate) => Bitrate): BitratePrintable;
    }

    /** Stream informations */
    export interface StreamData extends Stream {
      /** Bitrate in bit */
      bitrate: BitratePrintable;
      /** Conversion to string for FFmpeg */
      toString(): string;
    }

    /** Specific stream bitrate */
    export const Bitrate = (
      type: Type,
      bitrate: Bitrate,
      streamIndex: number = null,
    ): StreamData => ({
      type,
      streamIndex,
      bitrate: {
        ...bitrate,
        toString() {
          return `${this.value}${this.unit}`;
        },
        transform(fn: (value: Bitrate) => Bitrate) {
          return {
            ...this,
            ...fn(this),
          };
        },
      },
      toString() {
        return (
          `-b:${this.type.prefix}` +
          (this.streamIndex !== null ? `:${this.streamIndex}` : "")
        );
      },
    });

    export enum DispositionAction {
      /** Make stream as the default one */
      MakeDefault = "default",
      /** Remove disposition informations */
      Erase = "0",
    }

    interface DispositionTarget {
      /** Targeted type */
      type: Type;
      /** If null, target all stream of the type */
      index: number | null;
    }

    export const DispositionTarget = (
      type: Type,
      index: number = null,
    ): DispositionTarget => ({
      type,
      index,
    });

    interface Disposition {
      target: DispositionTarget;
      action: DispositionAction;
    }

    export interface DispositionInfo {
      disposition: Disposition;
      /** Conversion to string for FFmpeg */
      toString(): string;
    }

    export const Disposition = (
      target: DispositionTarget,
      action: DispositionAction,
    ): DispositionInfo => ({
      disposition: { target, action },
      toString() {
        return [
          `-disposition:${target.type.prefix}` +
            (target.index !== null ? `:${target.index}` : ""),
          action,
        ]
          .filter((t) => t !== "")
          .join(" ");
      },
    });
  }

  const newTrack = (
    type: Stream.Type = null,
    trackIndex: number = null,
    streamIndex: number = null,
    customName: string = null,
  ): Track.Track => ({
    streamIndex,
    type,
    trackIndex,
    customName,
    toString: () =>
      customName ??
      [streamIndex, type?.prefix ?? null, trackIndex]
        .filter((el) => el !== null)
        .map((el) => `${el}`)
        .join(":"),
  });
  export function Track(
    type: Stream.Type = null,
    trackIndex: number = null,
    streamIndex: number = null,
  ): Track.Track {
    return newTrack(type, trackIndex, streamIndex);
  }
  export namespace Track {
    export interface Track extends Stream {
      /** Index of the track, starting from 0 */
      trackIndex: number | null;
      /** Used when we get a custom track from a complex filter */ // Maybe from something else?
      customName: string | null;
      /** Conversion to string for FFmpeg */
      toString(): string;
    }

    export const customTrack = (name: string = null): Track =>
      newTrack(undefined, undefined, undefined, name);

    export const AllVideosMonoInput = FFmpegArgument.Track(
      Stream.Type.Video,
      undefined,
      0,
    );

    export const AllAudiosMonoInput = FFmpegArgument.Track(
      Stream.Type.Audio,
      undefined,
      0,
    );

    /** Available metadata keys */
    enum Keys {
      Title = "title",
    }

    interface Metadata {
      /** Type reference */
      track: Track;
      /** Metadata key */
      key: Keys;
      /** Metadata value */
      value: string;
    }

    export interface MetadataPrintable extends Metadata {
      toStringArray(): string[];
    }

    /** Specific audio track */
    export const Audio = (index: number) => Track(Stream.Type.Audio, index);

    /** Attack a metadata to a track */
    export const Metadata = (
      track: Track,
      title: string,
    ): MetadataPrintable => {
      const key = Keys.Title;
      return {
        track,
        key,
        value: title,
        toStringArray: () => [
          `-metadata:s:${track.type.prefix}:${track.trackIndex}`,
          `${key}="${title}"`,
        ],
      };
    };
  }
}

/** FFmpeg command builder. **Very few checks are made.** */
export class FFmpegBuilder<
  HasInput extends boolean = false,
  HasOutput extends boolean = false,
> {
  declare protected _phantom: {
    inputCalled: HasInput;
    outputCalled: HasOutput;
  };

  constructor(private binaryPath: string) {}

  private onWindows = process.platform === "win32";

  // State Variables
  private _input: string[] = [];
  private _output: string = "";
  private _forceOverwrite: boolean = false;
  private _twoPass: string = null;
  private _hw: FFmpegArgument.HardwareBackend = null;

  // Video Settings
  private _videoCodec: FFmpegArgument.Codecs.Video = null;
  private _bitrates: FFmpegArgument.Stream.StreamData[] = [];
  private _videoFilters: FFmpegArgument.VideoFilters[] = [];

  // Audio/Structure Settings
  private _audioCodec: FFmpegArgument.Codecs.Audio = null;
  private _trackMappings: string[] = [];
  private _format: string = null;
  private _metadata: FFmpegArgument.Track.MetadataPrintable[] = [];
  private _movFlags: string[] = [];
  private _filterComplex: string[] = [];
  private _dispositions: FFmpegArgument.Stream.DispositionInfo[] = [];

  private clone<I extends boolean, O extends boolean>(): FFmpegBuilder<I, O> {
    // New object
    const copy = new FFmpegBuilder<I, O>(this.binaryPath);

    // Copy primitives
    Object.assign(copy, this);

    // Deep copy arrays
    copy._input = [...this._input];
    copy._bitrates = [...this._bitrates];
    copy._videoFilters = [...this._videoFilters];
    copy._trackMappings = [...this._trackMappings];
    copy._metadata = [...this._metadata];
    copy._movFlags = [...this._movFlags];
    copy._filterComplex = [...this._filterComplex];
    copy._dispositions = [...this._dispositions];

    return copy;
  }

  /**
   * Required field
   */
  input(path: string) {
    const newBuilder = this.clone<true, HasOutput>();
    newBuilder._input.push(path);
    return newBuilder;
  }

  /**
   * Required field
   */
  output(path: string) {
    const newBuilder = this.clone<HasInput, true>();
    newBuilder._output = path;
    return newBuilder;
  }

  /** Automatic confirm without prompting the user */
  yes() {
    this._forceOverwrite = true;
    return this;
  }

  /** Enable hardware acceleration with specific driver calls */
  hardwareAcceleration(driver: FFmpegArgument.HardwareBackend) {
    this._hw = driver;
    return this;
  }

  /** Use 2-pass method to get better compression results */
  twopass(nullOutput: FFmpegArgument.SystemNULL = null) {
    if (nullOutput === null) {
      this._twoPass = this.onWindows
        ? FFmpegArgument.SystemNULL.Windows
        : FFmpegArgument.SystemNULL.Linux;
    } else {
      this._twoPass = nullOutput;
      this.onWindows = nullOutput === FFmpegArgument.SystemNULL.Windows;
    }
    return this;
  }

  /** Specify the codec used to create the video tracks */
  videoCodec(codec: FFmpegArgument.Codecs.Video) {
    this._videoCodec = codec;
    return this;
  }

  /** Specify the bitrate used for the video tracks */
  bitrate(stream: FFmpegArgument.Stream.StreamData) {
    this._bitrates.push(stream);
    return this;
  }

  /** Specify the codec used to create the audio tracks */
  audioCodec(codec: FFmpegArgument.Codecs.Audio) {
    this._audioCodec = codec;
    return this;
  }

  /** Custom video filter that will be applied to the video */
  videoFilter(filter: FFmpegArgument.VideoFilters) {
    this._videoFilters.push(filter);
    return this;
  }

  /** Specify the tracks to add to the ouput video */
  tracks(mapping: FFmpegArgument.Track.Track, optionalOnly = true) {
    this._trackMappings.push(mapping.toString() + (optionalOnly ? "" : "?"));
    return this;
  }

  /** Change the output video format */
  outputFormat(format: FFmpegArgument.Formats) {
    this._format = format;
    return this;
  }

  /** Applies custom metadata to specific tracks */
  customMetadata(metadata: FFmpegArgument.Track.MetadataPrintable) {
    this._metadata.push(metadata);
    return this;
  }

  /** Enable optimizations for streaming */
  streamingOptimization() {
    this._movFlags.push("+faststart");
    return this;
  }

  /** Adds filtergraph that define feature applied to streams */
  filterComplex(filter: string) {
    this._filterComplex.push(filter);
    return this;
  }

  /** Change stream disposition flags.
   *  About disposition: https://ffmpeg.org/ffmpeg.html#Main-options */
  disposition(disposition: FFmpegArgument.Stream.DispositionInfo) {
    this._dispositions.push(disposition);
    return this;
  }

  /** Check if a value changed */
  private static changed(value: any) {
    return value && (!Array.isArray(value) || value.length > 0);
  }

  /** Generate FFmpeg call */
  private build(pass: 1 | 2 = null) {
    const args = [];

    // Binary
    args.push(`"${this.binaryPath}"`);

    // Global Flags
    if (this._forceOverwrite) {
      args.push("-y");
    }

    // Add hw support only if the selected codec supports it
    if (FFmpegBuilder.changed(this._hw) && this._videoCodec[this._hw]) {
      const hw = ["-hwaccel", this._hw];
      if (!this.onWindows) {
        // Specific outpout format on Linux
        hw.push(...["-hwaccel_output_format", this._hw]);
      }
      args.push(...hw);
    }

    // Input
    args.push(...this._input.flatMap((i) => ["-i", `"${i}"`]));

    // Video
    if (FFmpegBuilder.changed(this._videoCodec)) {
      args.push(
        `-c:${FFmpegArgument.Stream.Type.Video.prefix}`,
        this._videoCodec[this._hw] ?? this._videoCodec.default,
      );

      // Add encoder flags
      if (
        !FFmpegBuilder.changed(this._hw) ||
        this._videoCodec[this._hw] === undefined
      ) {
        // No hardware acceleration
        switch (this._videoCodec) {
          case FFmpegArgument.Codecs.Video.H264: {
            if (FFmpegBuilder.changed(this._movFlags)) {
              args.push("-tune", "fastdecode");
            }
            break;
          }
          case FFmpegArgument.Codecs.Video.H265: {
            if (FFmpegBuilder.changed(this._movFlags)) {
              args.push("-tune", "fastdecode");
            }
            break;
          }
          case FFmpegArgument.Codecs.Video.AV1: {
            // Speed up compression, which take ages on CPU (at quality cost)
            // See: https://trac.ffmpeg.org/wiki/Encode/AV1#ControllingSpeedQuality
            args.push("-cpu-used", "6");
            break;
          }
          case FFmpegArgument.Codecs.Video.VP9: {
            // Speed up on CPU
            // See: https://trac.ffmpeg.org/wiki/Encode/VP9#rowmt
            args.push("-row-mt", "1");
            args.push("-tune-content", "screen");
          }
        }
      } else {
        // With hardware acceleration

        /** Extra data about bitrate for VBR */
        const vbr_args = (() => {
          const bitrate = this._bitrates.find(
            (s) => s.type === FFmpegArgument.Stream.Type.Video,
          )?.bitrate;
          return bitrate
            ? [
                "-maxrate",
                bitrate.toString(), // Same as video bitrate
                "-bufsize",
                bitrate
                  .transform((b) => ({ ...b, value: b.value * 2 }))
                  .toString(),
              ]
            : [];
        })();

        if (this._videoCodec[this._hw]) {
          switch (this._hw) {
            case FFmpegArgument.HardwareBackend.Cuda: {
              args.push("-rc", "vbr");
              args.push("-multipass", "fullres");
              args.push(...vbr_args);
              break;
            }
            case FFmpegArgument.HardwareBackend.DirectX11: {
              // Maybe -rc is getting overwritten by -usage?
              args.push("-rc", "vbr_peak");
              args.push("-usage", "transcoding");
              args.push(...vbr_args);
              break;
            }
            case FFmpegArgument.HardwareBackend.VAAPI: {
              args.push("-rc_mode", "VBR");
              args.push(...vbr_args);
              break;
            }
            case FFmpegArgument.HardwareBackend.Vulkan: {
              // Maybe some flags are overwritting others?
              args.push("-rc_mode", "vbr");
              args.push("-usage", "transcode");
              args.push("-content", "rendered");
              args.push(...vbr_args);
              break;
            }
            case FFmpegArgument.HardwareBackend.QSV: {
              if (
                this._videoCodec === FFmpegArgument.Codecs.Video.H264 ||
                this._videoCodec === FFmpegArgument.Codecs.Video.H265
              ) {
                args.push("-scenario", "gamestreaming");
              }
              break;
            }
          }
        }
      }
    }

    this._bitrates
      .filter((s) => s.type === FFmpegArgument.Stream.Type.Video)
      .forEach((s) => {
        args.push(s.toString(), s.bitrate.toString());
      });

    if (FFmpegBuilder.changed(this._videoFilters)) {
      args.push(
        "-vf",
        this._videoFilters.map((vf) => vf[this._hw] ?? vf.default).join(","),
      );
    }

    if (FFmpegBuilder.changed(this._filterComplex)) {
      args.push(
        ...this._filterComplex.flatMap((f) => ["-filter_complex", `"${f}"`]),
      );
    }

    // Pass-specific logic
    switch (pass) {
      case 1: {
        switch (this._videoCodec) {
          case FFmpegArgument.Codecs.Video.H265: {
            args.push("-x265-params", "pass=1");
            break;
          }
          default: {
            args.push("-pass", "1");
            break;
          }
        }

        // No audio in pass 1
        args.push("-an");
        args.push("-f", "null");

        // Pass 1 output goes to null
        args.push(this._twoPass);

        return args.join(" ");
      }
      case 2: {
        switch (this._videoCodec) {
          case FFmpegArgument.Codecs.Video.H265: {
            args.push("-x265-params", "pass=2");
            break;
          }
          default: {
            args.push("-pass", "2");
            break;
          }
        }
      }
    }

    // Audio
    if (FFmpegBuilder.changed(this._audioCodec)) {
      args.push(
        `-c:${FFmpegArgument.Stream.Type.Audio.prefix}`,
        this._audioCodec,
      );
    }

    this._bitrates
      .filter((s) => s.type === FFmpegArgument.Stream.Type.Audio)
      .forEach((s) => {
        args.push(s.toString(), s.bitrate.toString());
      });

    // Mappings
    this._trackMappings.forEach((map) => {
      args.push("-map", map);
    });

    // Formats
    if (FFmpegBuilder.changed(this._format)) {
      args.push("-f", this._format);
    }

    // Dispositions
    if (FFmpegBuilder.changed(this._dispositions)) {
      args.push(...this._dispositions.map(String));
    }

    // Metadata
    this._metadata.forEach((m) => {
      args.push(...m.toStringArray());
    });

    // Streaming Flags
    if (FFmpegBuilder.changed(this._movFlags)) {
      args.push("-movflags", this._movFlags.join(","));
    }

    // Output File
    args.push(`"${this._output}"`);

    return args.join(" ");
  }

  /** Build FFmpeg command */
  toString(this: FFmpegBuilder<true, true>): string {
    if (FFmpegBuilder.changed(this._twoPass)) {
      const pass1 = this.build(1);
      const pass2 = this.build(2);
      return `${pass1} && ${pass2}`;
    }

    return this.build();
  }

  leftoverFiles(): string[] {
    if (FFmpegBuilder.changed(this._twoPass)) {
      switch (this._videoCodec) {
        case FFmpegArgument.Codecs.Video.H264: {
          return ["ffmpeg2pass-0.log", "ffmpeg2pass-0.log.mbtree"];
        }
        case FFmpegArgument.Codecs.Video.H265: {
          return ["x265_2pass.log", "x265_2pass.log.cutree"];
        }
        case FFmpegArgument.Codecs.Video.AV1: {
          return ["ffmpeg2pass-0.log"];
        }
        case FFmpegArgument.Codecs.Video.VP9: {
          return ["ffmpeg2pass-0.log"];
        }
      }
    }

    return [];
  }
}
