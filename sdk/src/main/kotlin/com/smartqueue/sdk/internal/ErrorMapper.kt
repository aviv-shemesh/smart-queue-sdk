package com.smartqueue.sdk.internal

import com.smartqueue.sdk.models.SmartQueueResult
import retrofit2.HttpException
import java.io.IOException

internal object ErrorMapper {

    fun map(e: Throwable): SmartQueueResult.Error {
        return when (e) {
            is HttpException -> {
                val code = parseErrorCode(e)
                SmartQueueResult.Error(code, e.message())
            }
            is IOException -> SmartQueueResult.Error("NETWORK_ERROR", "Check your internet connection.")
            else -> SmartQueueResult.Error("UNKNOWN_ERROR", e.message ?: "Unknown error")
        }
    }

    private fun parseErrorCode(e: HttpException): String {
        return try {
            val body = e.response()?.errorBody()?.string() ?: return "HTTP_${e.code()}"
            val regex = """"error"\s*:\s*"([^"]+)"""".toRegex()
            regex.find(body)?.groupValues?.get(1) ?: "HTTP_${e.code()}"
        } catch (_: Exception) {
            "HTTP_${e.code()}"
        }
    }
}
