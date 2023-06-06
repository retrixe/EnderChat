package com.enderchat.modules.connection

import java.io.ByteArrayOutputStream
import java.util.zip.Deflater
import java.util.zip.Inflater

const val PROTOCOL_VERSION_1164 = 754
const val PROTOCOL_VERSION_117 = 755
const val PROTOCOL_VERSION_119 = 759
const val PROTOCOL_VERSION_1191 = 760
const val PROTOCOL_VERSION_1193 = 761
const val PROTOCOL_VERSION_1194 = 762

fun compressData(bytes: ByteArray): ByteArray {
    ByteArrayOutputStream(bytes.size).use {
        val deflater = Deflater().apply {
            setStrategy(Deflater.DEFAULT_STRATEGY)
            setLevel(Deflater.DEFAULT_COMPRESSION)
            setInput(bytes)
            finish()
        }
        val buffer = ByteArray(1024)
        while (!deflater.finished()) {
            val count = deflater.deflate(buffer)
            it.write(buffer, 0, count)
        }
        deflater.end()
        return it.toByteArray()
    }
}

fun decompressData(bytes: ByteArray): ByteArray {
    ByteArrayOutputStream(bytes.size).use {
        val inflater = Inflater().apply {
            setInput(bytes)
        }
        val buffer = ByteArray(1024)
        while (!inflater.finished()) {
            val count = inflater.inflate(buffer)
            it.write(buffer, 0, count)
        }
        inflater.end()
        return it.toByteArray()
    }
}
