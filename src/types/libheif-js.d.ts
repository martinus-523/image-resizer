declare module "libheif-js" {
  export interface HeifImage {
    get_width(): number;
    get_height(): number;
    display(out: ImageData, cb: (data: ImageData | null) => void): void;
  }
  export interface HeifDecoderInstance {
    decode(bytes: ArrayBufferView | ArrayBuffer): HeifImage[];
  }
  export interface HeifDecoderCtor {
    new (): HeifDecoderInstance;
  }
  const libheif: { HeifDecoder: HeifDecoderCtor };
  export default libheif;
}
