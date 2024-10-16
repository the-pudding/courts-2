"use strict";
(() => {
  // ../loader-utils/src/lib/module-utils/js-module-utils.ts
  console.log("loading library")

  function registerJSModules(modules) {
    globalThis.loaders ||= {};
    globalThis.loaders.modules ||= {};
    Object.assign(globalThis.loaders.modules, modules);
  }
  function getJSModuleOrNull(name) {
    const module = globalThis.loaders?.modules?.[name];
    return module || null;
  }

  // ../worker-utils/src/lib/env-utils/version.ts
  function getVersion() {
    if (!globalThis._loadersgl_?.version) {
      globalThis._loadersgl_ = globalThis._loadersgl_ || {};
      if (false) {
        console.warn(
          "loaders.gl: The __VERSION__ variable is not injected using babel plugin. Latest unstable workers would be fetched from the CDN."
        );
        globalThis._loadersgl_.version = NPM_TAG;
      } else {
        globalThis._loadersgl_.version = "4.2.0-beta.2";
      }
    }
    return globalThis._loadersgl_.version;
  }
  var VERSION = getVersion();

  // ../worker-utils/src/lib/env-utils/assert.ts
  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || "loaders.gl assertion failed.");
    }
  }

  // ../worker-utils/src/lib/env-utils/globals.ts
  var globals = {
    self: typeof self !== "undefined" && self,
    window: typeof window !== "undefined" && window,
    global: typeof global !== "undefined" && global,
    document: typeof document !== "undefined" && document
  };
  var self_ = globals.self || globals.window || globals.global || {};
  var window_ = globals.window || globals.self || globals.global || {};
  var global_ = globals.global || globals.self || globals.window || {};
  var document_ = globals.document || {};
  var isBrowser = (
    // @ts-ignore process.browser
    typeof process !== "object" || String(process) !== "[object process]" || process.browser
  );
  var isWorker = typeof importScripts === "function";
  var isMobile = typeof window !== "undefined" && typeof window.orientation !== "undefined";
  var matches = typeof process !== "undefined" && process.version && /v([0-9]*)/.exec(process.version);
  var nodeVersion = matches && parseFloat(matches[1]) || 0;

  // ../worker-utils/src/lib/node/worker_threads-browser.ts
  var parentPort = null;

  // ../worker-utils/src/lib/worker-utils/get-transfer-list.ts
  function getTransferList(object, recursive = true, transfers) {
    const transfersSet = transfers || /* @__PURE__ */ new Set();
    if (!object) {
    } else if (isTransferable(object)) {
      transfersSet.add(object);
    } else if (isTransferable(object.buffer)) {
      transfersSet.add(object.buffer);
    } else if (ArrayBuffer.isView(object)) {
    } else if (recursive && typeof object === "object") {
      for (const key in object) {
        getTransferList(object[key], recursive, transfersSet);
      }
    }
    return transfers === void 0 ? Array.from(transfersSet) : [];
  }
  function isTransferable(object) {
    if (!object) {
      return false;
    }
    if (object instanceof ArrayBuffer) {
      return true;
    }
    if (typeof MessagePort !== "undefined" && object instanceof MessagePort) {
      return true;
    }
    if (typeof ImageBitmap !== "undefined" && object instanceof ImageBitmap) {
      return true;
    }
    if (typeof OffscreenCanvas !== "undefined" && object instanceof OffscreenCanvas) {
      return true;
    }
    return false;
  }

  // ../worker-utils/src/lib/worker-farm/worker-body.ts
  async function getParentPort() {
    return parentPort;
  }
  var onMessageWrapperMap = /* @__PURE__ */ new Map();
  var WorkerBody = class {
    /** Check that we are actually in a worker thread */
    static async inWorkerThread() {
      return typeof self !== "undefined" || Boolean(await getParentPort());
    }
    /*
     * (type: WorkerMessageType, payload: WorkerMessagePayload) => any
     */
    static set onmessage(onMessage) {
      async function handleMessage(message) {
        const parentPort2 = await getParentPort();
        const { type, payload } = parentPort2 ? message : message.data;
        onMessage(type, payload);
      }
      getParentPort().then((parentPort2) => {
        if (parentPort2) {
          parentPort2.on("message", (message) => {
            handleMessage(message);
          });
          parentPort2.on("exit", () => console.debug("Node worker closing"));
        } else {
          globalThis.onmessage = handleMessage;
        }
      });
    }
    static async addEventListener(onMessage) {
      let onMessageWrapper = onMessageWrapperMap.get(onMessage);
      if (!onMessageWrapper) {
        onMessageWrapper = async (message) => {
          if (!isKnownMessage(message)) {
            return;
          }
          const parentPort3 = await getParentPort();
          const { type, payload } = parentPort3 ? message : message.data;
          onMessage(type, payload);
        };
      }
      const parentPort2 = await getParentPort();
      if (parentPort2) {
        console.error("not implemented");
      } else {
        globalThis.addEventListener("message", onMessageWrapper);
      }
    }
    static async removeEventListener(onMessage) {
      const onMessageWrapper = onMessageWrapperMap.get(onMessage);
      onMessageWrapperMap.delete(onMessage);
      const parentPort2 = await getParentPort();
      if (parentPort2) {
        console.error("not implemented");
      } else {
        globalThis.removeEventListener("message", onMessageWrapper);
      }
    }
    /**
     * Send a message from a worker to creating thread (main thread)
     * @param type
     * @param payload
     */
    static async postMessage(type, payload) {
      const data = { source: "loaders.gl", type, payload };
      const transferList = getTransferList(payload);
      const parentPort2 = await getParentPort();
      if (parentPort2) {
        parentPort2.postMessage(data, transferList);
      } else {
        globalThis.postMessage(data, transferList);
      }
    }
  };
  function isKnownMessage(message) {
    const { type, data } = message;
    return type === "message" && data && typeof data.source === "string" && data.source.startsWith("loaders.gl");
  }

  // ../worker-utils/src/lib/library-utils/library-utils.ts
  var loadLibraryPromises = {};
  async function loadLibrary(libraryUrl, moduleName = null, options = {}, libraryName = null) {
    if (moduleName) {
      libraryUrl = getLibraryUrl(libraryUrl, moduleName, options, libraryName);
    }
    loadLibraryPromises[libraryUrl] = // eslint-disable-next-line @typescript-eslint/no-misused-promises
    loadLibraryPromises[libraryUrl] || loadLibraryFromFile(libraryUrl);
    return await loadLibraryPromises[libraryUrl];
  }
  function getLibraryUrl(library, moduleName, options = {}, libraryName = null) {
    if (!options.useLocalLibraries && library.startsWith("http")) {
      return library;
    }
    libraryName = libraryName || library;
    const modules = options.modules || {};
    if (modules[libraryName]) {
      return modules[libraryName];
    }
    if (!isBrowser) {
      return `modules/${moduleName}/dist/libs/${libraryName}`;
    }
    if (options.CDN) {
      assert(options.CDN.startsWith("http"));
      return `${options.CDN}/${moduleName}@${VERSION}/dist/libs/${libraryName}`;
    }
    if (isWorker) {
      return `../libs/${libraryName}`;
    }
    return `modules/${moduleName}/libs/${libraryName}`;
  }
  async function loadLibraryFromFile(libraryUrl) {
    if (libraryUrl.endsWith("wasm")) {
      return await loadAsArrayBuffer(libraryUrl);
    }
    if (!isBrowser) {
      try {
        const { requireFromFile } = globalThis.loaders || {};
        return await requireFromFile?.(libraryUrl);
      } catch (error) {
        console.error(error);
        return null;
      }
    }
    if (isWorker) {
      return importScripts(libraryUrl);
    }
    const scriptSource = await loadAsText(libraryUrl);
    return loadLibraryFromString(scriptSource, libraryUrl);
  }
  function loadLibraryFromString(scriptSource, id) {
    if (!isBrowser) {
      const { requireFromString } = globalThis.loaders || {};
      return requireFromString?.(scriptSource, id);
    }
    if (isWorker) {
      eval.call(globalThis, scriptSource);
      return null;
    }
    const script = document.createElement("script");
    script.id = id;
    try {
      script.appendChild(document.createTextNode(scriptSource));
    } catch (e) {
      script.text = scriptSource;
    }
    document.body.appendChild(script);
    return null;
  }
  async function loadAsArrayBuffer(url) {
    const { readFileAsArrayBuffer } = globalThis.loaders || {};
    if (isBrowser || !readFileAsArrayBuffer || url.startsWith("http")) {
      const response = await fetch(url);
      return await response.arrayBuffer();
    }
    return await readFileAsArrayBuffer(url);
  }
  async function loadAsText(url) {
    const { readFileAsText } = globalThis.loaders || {};
    if (isBrowser || !readFileAsText || url.startsWith("http")) {
      const response = await fetch(url);
      return await response.text();
    }
    return await readFileAsText(url);
  }

  // ../loader-utils/src/lib/worker-loader-utils/create-loader-worker.ts
  var requestId = 0;
  async function createLoaderWorker(loader) {
    if (!await WorkerBody.inWorkerThread()) {
      return;
    }
    WorkerBody.onmessage = async (type, payload) => {
      switch (type) {
        case "process":
          try {
            const { input, options = {}, context = {} } = payload;
            const result = await parseData({
              loader,
              arrayBuffer: input,
              options,
              // @ts-expect-error fetch missing
              context: {
                ...context,
                _parse: parseOnMainThread
              }
            });
            WorkerBody.postMessage("done", { result });
          } catch (error) {
            const message = error instanceof Error ? error.message : "";
            WorkerBody.postMessage("error", { error: message });
          }
          break;
        default:
      }
    };
  }
  function parseOnMainThread(arrayBuffer, loader, options, context) {
    return new Promise((resolve, reject) => {
      const id = requestId++;
      const onMessage = (type, payload2) => {
        if (payload2.id !== id) {
          return;
        }
        switch (type) {
          case "done":
            WorkerBody.removeEventListener(onMessage);
            resolve(payload2.result);
            break;
          case "error":
            WorkerBody.removeEventListener(onMessage);
            reject(payload2.error);
            break;
          default:
        }
      };
      WorkerBody.addEventListener(onMessage);
      const payload = { id, input: arrayBuffer, options };
      WorkerBody.postMessage("process", payload);
    });
  }
  async function parseData({
    loader,
    arrayBuffer,
    options,
    context
  }) {
    let data;
    let parser;
    if (loader.parseSync || loader.parse) {
      data = arrayBuffer;
      parser = loader.parseSync || loader.parse;
    } else if (loader.parseTextSync) {
      const textDecoder = new TextDecoder();
      data = textDecoder.decode(arrayBuffer);
      parser = loader.parseTextSync;
    } else {
      throw new Error(`Could not load data with ${loader.name} loader`);
    }
    options = {
      ...options,
      modules: loader && loader.options && loader.options.modules || {},
      worker: false
    };
    return await parser(data, { ...options }, context, loader);
  }

  // src/lib/utils/version.ts
  var VERSION2 = true ? "4.2.0-beta.2" : "latest";

  // src/lib/parsers/basis-module-loader.ts
  var BASIS_EXTERNAL_LIBRARIES = {
    /** Basis transcoder, javascript wrapper part */
    TRANSCODER: "basis_transcoder.js",
    /** Basis transcoder, compiled web assembly part */
    TRANSCODER_WASM: "basis_transcoder.wasm",
    /** Basis encoder, javascript wrapper part */
    ENCODER: "basis_encoder.js",
    /** Basis encoder, compiled web assembly part */
    ENCODER_WASM: "basis_encoder.wasm"
  };
  var loadBasisTranscoderPromise;
  async function loadBasisTranscoderModule(options) {
    registerJSModules(options.modules);
    const basis = getJSModuleOrNull("basis");
    if (basis) {
      return basis;
    }
    loadBasisTranscoderPromise ||= loadBasisTranscoder(options);
    return await loadBasisTranscoderPromise;
  }
  async function loadBasisTranscoder(options) {
    let BASIS = null;
    let wasmBinary = null;
    [BASIS, wasmBinary] = await Promise.all([
      await loadLibrary(BASIS_EXTERNAL_LIBRARIES.TRANSCODER, "textures", options),
      await loadLibrary(BASIS_EXTERNAL_LIBRARIES.TRANSCODER_WASM, "textures", options)
    ]);
    BASIS = BASIS || globalThis.BASIS;
    return await initializeBasisTranscoderModule(BASIS, wasmBinary);
  }
  function initializeBasisTranscoderModule(BasisModule, wasmBinary) {
    const options = {};
    if (wasmBinary) {
      options.wasmBinary = wasmBinary;
    }
    return new Promise((resolve) => {
      BasisModule(options).then((module) => {
        const { BasisFile, initializeBasis } = module;
        initializeBasis();
        resolve({ BasisFile });
      });
    });
  }
  var loadBasisEncoderPromise;
  async function loadBasisEncoderModule(options) {
    const modules = options.modules || {};
    if (modules.basisEncoder) {
      return modules.basisEncoder;
    }
    loadBasisEncoderPromise = loadBasisEncoderPromise || loadBasisEncoder(options);
    return await loadBasisEncoderPromise;
  }
  async function loadBasisEncoder(options) {
    let BASIS_ENCODER = null;
    let wasmBinary = null;
    [BASIS_ENCODER, wasmBinary] = await Promise.all([
      await loadLibrary(BASIS_EXTERNAL_LIBRARIES.ENCODER, "textures", options),
      await loadLibrary(BASIS_EXTERNAL_LIBRARIES.ENCODER_WASM, "textures", options)
    ]);
    BASIS_ENCODER = BASIS_ENCODER || globalThis.BASIS;
    return await initializeBasisEncoderModule(BASIS_ENCODER, wasmBinary);
  }
  function initializeBasisEncoderModule(BasisEncoderModule, wasmBinary) {
    const options = {};
    if (wasmBinary) {
      options.wasmBinary = wasmBinary;
    }
    return new Promise((resolve) => {
      BasisEncoderModule(options).then((module) => {
        const { BasisFile, KTX2File, initializeBasis, BasisEncoder } = module;
        initializeBasis();
        resolve({ BasisFile, KTX2File, BasisEncoder });
      });
    });
  }

  // src/lib/gl-extensions.ts
  var GL_EXTENSIONS_CONSTANTS = {
    // WEBGL_compressed_texture_s3tc
    COMPRESSED_RGB_S3TC_DXT1_EXT: 33776,
    COMPRESSED_RGBA_S3TC_DXT1_EXT: 33777,
    COMPRESSED_RGBA_S3TC_DXT3_EXT: 33778,
    COMPRESSED_RGBA_S3TC_DXT5_EXT: 33779,
    // WEBGL_compressed_texture_es3
    COMPRESSED_R11_EAC: 37488,
    COMPRESSED_SIGNED_R11_EAC: 37489,
    COMPRESSED_RG11_EAC: 37490,
    COMPRESSED_SIGNED_RG11_EAC: 37491,
    COMPRESSED_RGB8_ETC2: 37492,
    COMPRESSED_RGBA8_ETC2_EAC: 37493,
    COMPRESSED_SRGB8_ETC2: 37494,
    COMPRESSED_SRGB8_ALPHA8_ETC2_EAC: 37495,
    COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2: 37496,
    COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2: 37497,
    // WEBGL_compressed_texture_pvrtc
    COMPRESSED_RGB_PVRTC_4BPPV1_IMG: 35840,
    COMPRESSED_RGBA_PVRTC_4BPPV1_IMG: 35842,
    COMPRESSED_RGB_PVRTC_2BPPV1_IMG: 35841,
    COMPRESSED_RGBA_PVRTC_2BPPV1_IMG: 35843,
    // WEBGL_compressed_texture_etc1
    COMPRESSED_RGB_ETC1_WEBGL: 36196,
    // WEBGL_compressed_texture_atc
    COMPRESSED_RGB_ATC_WEBGL: 35986,
    COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL: 35987,
    COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL: 34798,
    // WEBGL_compressed_texture_astc
    COMPRESSED_RGBA_ASTC_4X4_KHR: 37808,
    COMPRESSED_RGBA_ASTC_5X4_KHR: 37809,
    COMPRESSED_RGBA_ASTC_5X5_KHR: 37810,
    COMPRESSED_RGBA_ASTC_6X5_KHR: 37811,
    COMPRESSED_RGBA_ASTC_6X6_KHR: 37812,
    COMPRESSED_RGBA_ASTC_8X5_KHR: 37813,
    COMPRESSED_RGBA_ASTC_8X6_KHR: 37814,
    COMPRESSED_RGBA_ASTC_8X8_KHR: 37815,
    COMPRESSED_RGBA_ASTC_10X5_KHR: 37816,
    COMPRESSED_RGBA_ASTC_10X6_KHR: 37817,
    COMPRESSED_RGBA_ASTC_10X8_KHR: 37818,
    COMPRESSED_RGBA_ASTC_10X10_KHR: 37819,
    COMPRESSED_RGBA_ASTC_12X10_KHR: 37820,
    COMPRESSED_RGBA_ASTC_12X12_KHR: 37821,
    COMPRESSED_SRGB8_ALPHA8_ASTC_4X4_KHR: 37840,
    COMPRESSED_SRGB8_ALPHA8_ASTC_5X4_KHR: 37841,
    COMPRESSED_SRGB8_ALPHA8_ASTC_5X5_KHR: 37842,
    COMPRESSED_SRGB8_ALPHA8_ASTC_6X5_KHR: 37843,
    COMPRESSED_SRGB8_ALPHA8_ASTC_6X6_KHR: 37844,
    COMPRESSED_SRGB8_ALPHA8_ASTC_8X5_KHR: 37845,
    COMPRESSED_SRGB8_ALPHA8_ASTC_8X6_KHR: 37846,
    COMPRESSED_SRGB8_ALPHA8_ASTC_8X8_KHR: 37847,
    COMPRESSED_SRGB8_ALPHA8_ASTC_10X5_KHR: 37848,
    COMPRESSED_SRGB8_ALPHA8_ASTC_10X6_KHR: 37849,
    COMPRESSED_SRGB8_ALPHA8_ASTC_10X8_KHR: 37850,
    COMPRESSED_SRGB8_ALPHA8_ASTC_10X10_KHR: 37851,
    COMPRESSED_SRGB8_ALPHA8_ASTC_12X10_KHR: 37852,
    COMPRESSED_SRGB8_ALPHA8_ASTC_12X12_KHR: 37853,
    // EXT_texture_compression_rgtc
    COMPRESSED_RED_RGTC1_EXT: 36283,
    COMPRESSED_SIGNED_RED_RGTC1_EXT: 36284,
    COMPRESSED_RED_GREEN_RGTC2_EXT: 36285,
    COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT: 36286,
    // WEBGL_compressed_texture_s3tc_srgb
    COMPRESSED_SRGB_S3TC_DXT1_EXT: 35916,
    COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT: 35917,
    COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT: 35918,
    COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT: 35919
  };

  // src/lib/utils/texture-formats.ts
  var BROWSER_PREFIXES = ["", "WEBKIT_", "MOZ_"];
  var WEBGL_EXTENSIONS = {
    /* eslint-disable camelcase */
    WEBGL_compressed_texture_s3tc: "dxt",
    WEBGL_compressed_texture_s3tc_srgb: "dxt-srgb",
    WEBGL_compressed_texture_etc1: "etc1",
    WEBGL_compressed_texture_etc: "etc2",
    WEBGL_compressed_texture_pvrtc: "pvrtc",
    WEBGL_compressed_texture_atc: "atc",
    WEBGL_compressed_texture_astc: "astc",
    EXT_texture_compression_rgtc: "rgtc"
    /* eslint-enable camelcase */
  };
  var formats = null;
  function getSupportedGPUTextureFormats(gl) {
    if (!formats) {
      gl = gl || getWebGLContext() || void 0;
      formats = /* @__PURE__ */ new Set();
      for (const prefix of BROWSER_PREFIXES) {
        for (const extension in WEBGL_EXTENSIONS) {
          if (gl && gl.getExtension(`${prefix}${extension}`)) {
            const gpuTextureFormat = WEBGL_EXTENSIONS[extension];
            formats.add(gpuTextureFormat);
          }
        }
      }
    }
    return formats;
  }
  function getWebGLContext() {
    try {
      const canvas = document.createElement("canvas");
      return canvas.getContext("webgl");
    } catch (error) {
      return null;
    }
  }

  // ../../node_modules/ktx-parse/dist/ktx-parse.modern.js
  var t = new Uint8Array([0]);
  var n;
  var i;
  var s;
  var a;
  var r;
  var o;
  var l;
  var f;
  !function(t2) {
    t2[t2.NONE = 0] = "NONE", t2[t2.BASISLZ = 1] = "BASISLZ", t2[t2.ZSTD = 2] = "ZSTD", t2[t2.ZLIB = 3] = "ZLIB";
  }(n || (n = {})), function(t2) {
    t2[t2.BASICFORMAT = 0] = "BASICFORMAT";
  }(i || (i = {})), function(t2) {
    t2[t2.UNSPECIFIED = 0] = "UNSPECIFIED", t2[t2.ETC1S = 163] = "ETC1S", t2[t2.UASTC = 166] = "UASTC";
  }(s || (s = {})), function(t2) {
    t2[t2.UNSPECIFIED = 0] = "UNSPECIFIED", t2[t2.SRGB = 1] = "SRGB";
  }(a || (a = {})), function(t2) {
    t2[t2.UNSPECIFIED = 0] = "UNSPECIFIED", t2[t2.LINEAR = 1] = "LINEAR", t2[t2.SRGB = 2] = "SRGB", t2[t2.ITU = 3] = "ITU", t2[t2.NTSC = 4] = "NTSC", t2[t2.SLOG = 5] = "SLOG", t2[t2.SLOG2 = 6] = "SLOG2";
  }(r || (r = {})), function(t2) {
    t2[t2.ALPHA_STRAIGHT = 0] = "ALPHA_STRAIGHT", t2[t2.ALPHA_PREMULTIPLIED = 1] = "ALPHA_PREMULTIPLIED";
  }(o || (o = {})), function(t2) {
    t2[t2.RGB = 0] = "RGB", t2[t2.RRR = 3] = "RRR", t2[t2.GGG = 4] = "GGG", t2[t2.AAA = 15] = "AAA";
  }(l || (l = {})), function(t2) {
    t2[t2.RGB = 0] = "RGB", t2[t2.RGBA = 3] = "RGBA", t2[t2.RRR = 4] = "RRR", t2[t2.RRRG = 5] = "RRRG";
  }(f || (f = {}));

  // src/lib/parsers/parse-ktx.ts
  var KTX2_ID = [
    // '´', 'K', 'T', 'X', '2', '0', 'ª', '\r', '\n', '\x1A', '\n'
    171,
    75,
    84,
    88,
    32,
    50,
    48,
    187,
    13,
    10,
    26,
    10
  ];
  function isKTX(data) {
    const id = new Uint8Array(data);
    const notKTX = id.byteLength < KTX2_ID.length || id[0] !== KTX2_ID[0] || // '´'
    id[1] !== KTX2_ID[1] || // 'K'
    id[2] !== KTX2_ID[2] || // 'T'
    id[3] !== KTX2_ID[3] || // 'X'
    id[4] !== KTX2_ID[4] || // ' '
    id[5] !== KTX2_ID[5] || // '2'
    id[6] !== KTX2_ID[6] || // '0'
    id[7] !== KTX2_ID[7] || // 'ª'
    id[8] !== KTX2_ID[8] || // '\r'
    id[9] !== KTX2_ID[9] || // '\n'
    id[10] !== KTX2_ID[10] || // '\x1A'
    id[11] !== KTX2_ID[11];
    return !notKTX;
  }

  // src/lib/parsers/parse-basis.ts
  var OutputFormat = {
    etc1: {
      basisFormat: 0,
      compressed: true,
      format: GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGB_ETC1_WEBGL
    },
    etc2: { basisFormat: 1, compressed: true },
    bc1: {
      basisFormat: 2,
      compressed: true,
      format: GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGB_S3TC_DXT1_EXT
    },
    bc3: {
      basisFormat: 3,
      compressed: true,
      format: GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_S3TC_DXT5_EXT
    },
    bc4: { basisFormat: 4, compressed: true },
    bc5: { basisFormat: 5, compressed: true },
    "bc7-m6-opaque-only": { basisFormat: 6, compressed: true },
    "bc7-m5": { basisFormat: 7, compressed: true },
    "pvrtc1-4-rgb": {
      basisFormat: 8,
      compressed: true,
      format: GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGB_PVRTC_4BPPV1_IMG
    },
    "pvrtc1-4-rgba": {
      basisFormat: 9,
      compressed: true,
      format: GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG
    },
    "astc-4x4": {
      basisFormat: 10,
      compressed: true,
      format: GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_ASTC_4X4_KHR
    },
    "atc-rgb": { basisFormat: 11, compressed: true },
    "atc-rgba-interpolated-alpha": { basisFormat: 12, compressed: true },
    rgba32: { basisFormat: 13, compressed: false },
    rgb565: { basisFormat: 14, compressed: false },
    bgr565: { basisFormat: 15, compressed: false },
    rgba4444: { basisFormat: 16, compressed: false }
  };
  async function parseBasis(data, options) {
    if (options.basis.containerFormat === "auto") {
      if (isKTX(data)) {
        const fileConstructors = await loadBasisEncoderModule(options);
        return parseKTX2File(fileConstructors.KTX2File, data, options);
      }
      const { BasisFile } = await loadBasisTranscoderModule(options);
      return parseBasisFile(BasisFile, data, options);
    }
    switch (options.basis.module) {
      case "encoder":
        const fileConstructors = await loadBasisEncoderModule(options);
        switch (options.basis.containerFormat) {
          case "ktx2":
            return parseKTX2File(fileConstructors.KTX2File, data, options);
          case "basis":
          default:
            return parseBasisFile(fileConstructors.BasisFile, data, options);
        }
      case "transcoder":
      default:
        const { BasisFile } = await loadBasisTranscoderModule(options);
        return parseBasisFile(BasisFile, data, options);
    }
  }
  function parseBasisFile(BasisFile, data, options) {
    const basisFile = new BasisFile(new Uint8Array(data));
    try {
      if (!basisFile.startTranscoding()) {
        throw new Error("Failed to start basis transcoding");
      }
      const imageCount = basisFile.getNumImages();
      const images = [];
      for (let imageIndex = 0; imageIndex < imageCount; imageIndex++) {
        const levelsCount = basisFile.getNumLevels(imageIndex);
        const levels = [];
        for (let levelIndex = 0; levelIndex < levelsCount; levelIndex++) {
          levels.push(transcodeImage(basisFile, imageIndex, levelIndex, options));
        }
        images.push(levels);
      }
      return images;
    } finally {
      basisFile.close();
      basisFile.delete();
    }
  }
  function transcodeImage(basisFile, imageIndex, levelIndex, options) {
    const width = basisFile.getImageWidth(imageIndex, levelIndex);
    const height = basisFile.getImageHeight(imageIndex, levelIndex);
    const hasAlpha = basisFile.getHasAlpha(
      /* imageIndex, levelIndex */
    );
    const { compressed, format, basisFormat } = getBasisOptions(options, hasAlpha);
    const decodedSize = basisFile.getImageTranscodedSizeInBytes(imageIndex, levelIndex, basisFormat);
    const decodedData = new Uint8Array(decodedSize);
    if (!basisFile.transcodeImage(decodedData, imageIndex, levelIndex, basisFormat, 0, 0)) {
      throw new Error("failed to start Basis transcoding");
    }
    return {
      // standard loaders.gl image category payload
      width,
      height,
      data: decodedData,
      compressed,
      format,
      // Additional fields
      // Add levelSize field.
      hasAlpha
    };
  }
  function parseKTX2File(KTX2File, data, options) {
    const ktx2File = new KTX2File(new Uint8Array(data));
    try {
      if (!ktx2File.startTranscoding()) {
        throw new Error("failed to start KTX2 transcoding");
      }
      const levelsCount = ktx2File.getLevels();
      const levels = [];
      for (let levelIndex = 0; levelIndex < levelsCount; levelIndex++) {
        levels.push(transcodeKTX2Image(ktx2File, levelIndex, options));
        break;
      }
      return [levels];
    } finally {
      ktx2File.close();
      ktx2File.delete();
    }
  }
  function transcodeKTX2Image(ktx2File, levelIndex, options) {
    const { alphaFlag, height, width } = ktx2File.getImageLevelInfo(levelIndex, 0, 0);
    const { compressed, format, basisFormat } = getBasisOptions(options, alphaFlag);
    const decodedSize = ktx2File.getImageTranscodedSizeInBytes(
      levelIndex,
      0,
      0,
      basisFormat
    );
    const decodedData = new Uint8Array(decodedSize);
    if (!ktx2File.transcodeImage(
      decodedData,
      levelIndex,
      0,
      0,
      basisFormat,
      0,
      -1,
      -1
      /* channel1 */
    )) {
      throw new Error("Failed to transcode KTX2 image");
    }
    return {
      // standard loaders.gl image category payload
      width,
      height,
      data: decodedData,
      compressed,
      // Additional fields
      levelSize: decodedSize,
      hasAlpha: alphaFlag,
      format
    };
  }
  function getBasisOptions(options, hasAlpha) {
    let format = options && options.basis && options.basis.format;
    if (format === "auto") {
      format = selectSupportedBasisFormat();
    }
    if (typeof format === "object") {
      format = hasAlpha ? format.alpha : format.noAlpha;
    }
    format = format.toLowerCase();
    return OutputFormat[format];
  }
  function selectSupportedBasisFormat() {
    const supportedFormats = getSupportedGPUTextureFormats();
    if (supportedFormats.has("astc")) {
      return "astc-4x4";
    } else if (supportedFormats.has("dxt")) {
      return {
        alpha: "bc3",
        noAlpha: "bc1"
      };
    } else if (supportedFormats.has("pvrtc")) {
      return {
        alpha: "pvrtc1-4-rgba",
        noAlpha: "pvrtc1-4-rgb"
      };
    } else if (supportedFormats.has("etc1")) {
      return "etc1";
    } else if (supportedFormats.has("etc2")) {
      return "etc2";
    }
    return "rgb565";
  }

  // src/basis-loader.ts
  var BasisWorkerLoader = {
    dataType: null,
    batchType: null,
    name: "Basis",
    id: "basis",
    module: "textures",
    version: VERSION2,
    worker: true,
    extensions: ["basis", "ktx2"],
    mimeTypes: ["application/octet-stream", "image/ktx2"],
    tests: ["sB"],
    binary: true,
    options: {
      basis: {
        format: "auto",
        libraryPath: "libs/",
        containerFormat: "auto",
        module: "transcoder"
      }
    }
  };
  var BasisLoader = {
    ...BasisWorkerLoader,
    parse: parseBasis
  };

  // src/workers/basis-worker.ts
  createLoaderWorker(BasisLoader);
})();
