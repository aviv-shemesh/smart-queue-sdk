package com.smartqueue.sdk.internal

import com.smartqueue.sdk.models.SmartQueueResult
import retrofit2.HttpException
import java.io.IOException

internal object ErrorMapper {

    fun map(e: Throwable): SmartQueueResult.Error {
        return when (e) {
            is HttpException -> {
                // Read the body once — errorBody() is a one-shot stream.
                val body = try { e.response()?.errorBody()?.string() } catch (_: Exception) { null }
                val code    = extractField(body, "error")    ?: "HTTP_${e.code()}"
                val message = extractField(body, "message")  ?: e.message()
                SmartQueueResult.Error(code, message)
            }
            is IOException -> SmartQueueResult.Error("NETWORK_ERROR", "Check your internet connection.")
            else -> SmartQueueResult.Error("UNKNOWN_ERROR", e.message ?: "Unknown error")
        }
    }

    private fun extractField(body: String?, field: String): String? {
        if (body.isNullOrBlank()) return null
        return try {
            """"$field"\s*:\s*"([^"]+)"""".toRegex().find(body)?.groupValues?.get(1)
        } catch (_: Exception) {
            null
        }
    }
}
