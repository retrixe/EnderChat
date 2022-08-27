package com.enderchat.modules.connection.datatypes

import java.io.ByteArrayOutputStream

fun writeString(str: String): ByteArray {
    val bytes = str.toByteArray(Charsets.UTF_8)
    val concat = ByteArrayOutputStream()
    concat.write(VarInt.write(bytes.size).data)
    concat.write(bytes)
    return concat.toByteArray()
}
