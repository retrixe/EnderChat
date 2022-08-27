package com.enderchat.modules.connection.datatypes

import java.io.ByteArrayOutputStream

data class VarInt(val value: Int, val data: ByteArray) {
    companion object {
        fun read(varInt: ByteArray, offset: Int = 0): VarInt? {
            try {
                var value = 0
                var position = 0
                var currentByte: Byte
                var i = offset
                while (true) {
                    currentByte = varInt[i]
                    i++
                    value = value or (currentByte.toInt() and SEGMENT_BITS shl position)
                    if (currentByte.toInt() and CONTINUE_BIT == 0) break
                    position += 7
                    if (position >= 32) throw RuntimeException("VarInt is too big")
                }
                return VarInt(value, varInt.copyOfRange(offset, i))
            } catch (e: IndexOutOfBoundsException) {
                return null
            }
        }

        fun write(value: Int): VarInt {
            var toWrite = value
            val varInt = ByteArrayOutputStream()
            while (true) {
                if (toWrite and SEGMENT_BITS.inv() == 0) {
                    varInt.write(toWrite)
                    return VarInt(toWrite, varInt.toByteArray())
                }
                varInt.write(toWrite and SEGMENT_BITS or CONTINUE_BIT)

                // Note: >>> means that the sign bit is shifted with the rest of the number rather than being left alone
                toWrite = toWrite ushr 7
            }
        }
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as VarInt

        if (value != other.value) return false
        if (!data.contentEquals(other.data)) return false

        return true
    }

    override fun hashCode(): Int {
        var result = value
        result = 31 * result + data.contentHashCode()
        return result
    }
}
