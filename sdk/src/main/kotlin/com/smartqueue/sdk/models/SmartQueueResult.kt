package com.smartqueue.sdk.models

sealed class SmartQueueResult<out T> {
    data class Success<T>(val data: T) : SmartQueueResult<T>()
    data class Error(val code: String, val message: String) : SmartQueueResult<Nothing>()
}
