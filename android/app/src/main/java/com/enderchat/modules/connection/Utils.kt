package com.enderchat.modules.connection

import java.io.ByteArrayOutputStream
import java.util.zip.Deflater
import java.util.zip.Inflater

enum class ConnectionState {
    LOGIN,
    CONFIGURATION,
    PLAY
}

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
