package com.smartqueue.sdk.models

data class QueueTicket(
    val ticketId: String,
    val ticketNumber: Int,
    val status: String,
    val position: Int,
    val estimatedWaitSeconds: Int
)
