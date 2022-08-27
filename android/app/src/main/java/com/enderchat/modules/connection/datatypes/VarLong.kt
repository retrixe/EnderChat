package com.enderchat.modules.connection.datatypes

import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer

data class VarLong(val value: Long, val data: ByteArray) {
    companion object {
        fun read(varLong: ByteArray, offset: Int = 0): VarLong? {
            try {
                var value: Long = 0
                var position = 0
                var currentByte: Byte
                var i = offset
                while (true) {
                    currentByte = varLong[i]
                    i++
                    value = value or ((currentByte.toInt() and SEGMENT_BITS).toLong() shl position)
                    if (currentByte.toInt() and CONTINUE_BIT == 0) break
                    position += 7
                    if (position >= 64) throw RuntimeException("VarLong is too big")
                }
                return VarLong(value, varLong.copyOfRange(offset, i))
            } catch (e: IndexOutOfBoundsException) {
                return null
            }
        }

        fun write(value: Long): VarLong {
            var toWrite = value
            val buffer = ByteBuffer.allocate(Long.SIZE_BYTES)
            val varLong = ByteArrayOutputStream()
            while (true) {
                if (toWrite and SEGMENT_BITS.toLong().inv() == 0L) {
                    buffer.putLong(0, toWrite)
                    varLong.write(buffer.array())
                    return VarLong(toWrite, varLong.toByteArray())
                }
                buffer.putLong(0, toWrite and SEGMENT_BITS.toLong() or CONTINUE_BIT.toLong())
                varLong.write(buffer.array())

                // Note: >>> means that the sign bit is shifted with the rest of the number rather than being left alone
                toWrite = toWrite ushr 7
            }
        }
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as VarLong

        if (value != other.value) return false
        if (!data.contentEquals(other.data)) return false

        return true
    }

    override fun hashCode(): Int {
        var result = value.hashCode()
        result = 31 * result + data.contentHashCode()
        return result
    }
}
