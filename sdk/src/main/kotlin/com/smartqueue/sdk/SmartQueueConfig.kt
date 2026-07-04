package com.smartqueue.sdk

data class SmartQueueConfig(
    val baseUrl: String,
    val customerId: String? = null,
    val enableLogging: Boolean = false
)
