package com.smartqueue.sdk.models

data class QueueStatus(
    val id: String,
    val name: String,
    val status: String,
    val nowServing: Int,
    val waitingCount: Int,
    val averageServiceTimeSeconds: Int
)
