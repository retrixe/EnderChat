package com.enderchat.modules.connection.datatypes

import com.enderchat.modules.connection.compressData
import com.enderchat.modules.connection.decompressData
import java.io.ByteArrayOutputStream

data class Packet(val totalLength: Int?, val id: VarInt, val data: ByteArray) {
    constructor(id: VarInt, data: ByteArray) : this(null, id, data)

    constructor(id: Int, data: ByteArray) : this(VarInt.write(id), data)

    companion object {
        fun read(data: ByteArray): Packet? {
            val bodyLength = VarInt.read(data) ?: return null
            if (data.size < bodyLength.value + bodyLength.data.size) return null
            // Assert since this would be an error, not incomplete packet.
            val id = VarInt.read(data, bodyLength.data.size)!!
            val dataStart = id.data.size + bodyLength.data.size
            val totalLength = bodyLength.value + bodyLength.data.size
            val packetData = data.copyOfRange(dataStart, totalLength)

            return Packet(totalLength, id, packetData)
        }

        fun readCompressed(packet: ByteArray): Packet? {
            val ordinaryRead = read(packet) ?: return null
            val dataLength = ordinaryRead.id
            val compressedData = ordinaryRead.data
            val uncompressedData =
                if (dataLength.value <= 0) compressedData
                else decompressData(compressedData)
            val id = VarInt.read(uncompressedData)!! // Assert as error is expected if null.
            val data = uncompressedData.copyOfRange(id.data.size, uncompressedData.size)
            return Packet(ordinaryRead.totalLength, id, data)
        }
    }

    fun writePacket(): ByteArray {
        val packet = ByteArrayOutputStream()
        packet.write(VarInt.write(id.data.size + data.size).data)
        packet.write(id.data)
        packet.write(data)
        return packet.toByteArray()
    }

    fun writeCompressedPacket(threshold: Int): ByteArray {
        val packetData = ByteArrayOutputStream().use {
            it.write(id.data)
            it.write(data)
            return@use it.toByteArray()
        }
        val toCompress = packetData.size >= threshold
        val dataLength = VarInt.write(if (toCompress) packetData.size else 0)
        val compressedData = if (toCompress) compressData(packetData) else packetData
        val packetLength = VarInt.write(dataLength.data.size + compressedData.size)
        val packet = ByteArrayOutputStream()
        packet.write(packetLength.data)
        packet.write(dataLength.data)
        packet.write(compressedData)
        return packet.toByteArray()
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as Packet

        if (totalLength != other.totalLength) return false
        if (id != other.id) return false
        if (!data.contentEquals(other.data)) return false

        return true
    }

    override fun hashCode(): Int {
        var result = totalLength ?: 0
        result = 31 * result + id.hashCode()
        result = 31 * result + data.contentHashCode()
        return result
    }
}
