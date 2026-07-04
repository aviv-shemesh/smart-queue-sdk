package com.smartqueue.sdk.api.dto

import com.google.gson.annotations.SerializedName

data class JoinResponseDto(
    @SerializedName("ticket_id") val ticket_id: String,
    @SerializedName("ticket_number") val ticket_number: Int,
    @SerializedName("status") val status: String,
    @SerializedName("position") val position: Int,
    @SerializedName("estimated_wait_seconds") val estimated_wait_seconds: Int
)
