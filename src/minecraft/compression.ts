import zlib from 'zlib'

// This actually introduces a performance penalty compared to JS zlib, hence it's disabled.
/* const { CompressionModule } = NativeModules as {
  CompressionModule?: {
    compressData: (data: string) => Promise<string>
    decompressData: (data: string) => Promise<string>
  }
}

const isCompressionModuleAvailable =
  CompressionModule?.compressData && CompressionModule.decompressData */

export const compressData = (data: Buffer): Promise<Buffer> => {
  /* if (isCompressionModuleAvailable) {
    const res = await CompressionModule.compressData(data.toString('base64'))
    return Buffer.from(res, 'base64')
  } else */ return Promise.resolve(zlib.deflateSync(data))
}

export const decompressData = (data: Buffer): Promise<Buffer> => {
  /* if (isCompressionModuleAvailable) {
    const res = await CompressionModule.decompressData(data.toString('base64'))
    return Buffer.from(res, 'base64')
  } else */ return Promise.resolve(zlib.unzipSync(data, { finishFlush: 2 }))
}
