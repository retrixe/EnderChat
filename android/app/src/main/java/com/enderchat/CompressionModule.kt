package com.enderchat

import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.ByteArrayOutputStream
import java.util.zip.Deflater
import java.util.zip.Inflater

class CompressionModule(reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "CompressionModule"

    @ReactMethod fun compressData(data: String, promise: Promise) {
        val handler = (reactApplicationContext.currentActivity as MainActivity).dataTransformsThreadHandler
        val bytes = Base64.decode(data, Base64.DEFAULT)
        handler.post {
            try {
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
                    promise.resolve(Base64.encodeToString(it.toByteArray(), Base64.DEFAULT))
                }
            } catch (e: Exception) {
                promise.reject(e)
            }
        }
    }

    @ReactMethod fun decompressData(data: String, promise: Promise) {
        val handler = (reactApplicationContext.currentActivity as MainActivity).dataTransformsThreadHandler
        val bytes = Base64.decode(data, Base64.DEFAULT)
        handler.post {
            try {
                ByteArrayOutputStream(bytes.size).use {
                    val inflater = Inflater().apply { setInput(bytes) }
                    val buffer = ByteArray(1024)
                    while (!inflater.finished()) {
                        val count = inflater.inflate(buffer)
                        it.write(buffer, 0, count)
                    }
                    inflater.end()
                    promise.resolve(Base64.encodeToString(it.toByteArray(), Base64.DEFAULT))
                }
            } catch (e: Exception) {
                promise.reject(e)
            }
        }
    }
}
