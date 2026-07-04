package com.smartqueue.sdk.api.dto

import com.google.gson.annotations.SerializedName

data class QueueStatusDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("status") val status: String,
    @SerializedName("now_serving") val now_serving: Int,
    @SerializedName("waiting_count") val waiting_count: Int,
    @SerializedName("average_service_time_seconds") val average_service_time_seconds: Int
)
