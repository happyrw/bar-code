export {};

declare global {
  type BarcodeFormatString =
    | "aztec"
    | "code_128"
    | "code_39"
    | "code_93"
    | "codabar"
    | "data_matrix"
    | "ean_13"
    | "ean_8"
    | "itf"
    | "pdf417"
    | "qr_code"
    | "upc_a"
    | "upc_e";

  interface DetectedBarcode {
    rawValue: string;
    format: BarcodeFormatString;
  }

  interface BarcodeDetectorOptions {
    formats?: BarcodeFormatString[];
  }

  class BarcodeDetector {
    constructor(options?: BarcodeDetectorOptions);
    static getSupportedFormats(): Promise<BarcodeFormatString[]>;
    detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
  }

  interface Window {
    BarcodeDetector?: typeof BarcodeDetector;
  }
}
