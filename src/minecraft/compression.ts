import { NativeModules } from 'react-native'
import zlib from 'zlib'

const { CompressionModule } = NativeModules
// This actually introduces a performance penalty compared to JS zlib, hence it's disabled.
const isCompressionModuleAvailable = false
// CompressionModule && CompressionModule.compressData && CompressionModule.decompressData

export const compressData = async (data: Buffer): Promise<Buffer> => {
  if (isCompressionModuleAvailable) {
    const res = await CompressionModule.compressData(data.toString('base64'))
    return Buffer.from(res, 'base64')
  } else return zlib.deflateSync(data)
}

export const decompressData = async (data: Buffer): Promise<Buffer> => {
  if (isCompressionModuleAvailable) {
    const res = await CompressionModule.decompressData(data.toString('base64'))
    return Buffer.from(res, 'base64')
  } else return zlib.unzipSync(data, { finishFlush: 2 })
}
