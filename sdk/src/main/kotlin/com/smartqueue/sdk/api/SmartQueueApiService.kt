package com.smartqueue.sdk.api

import com.smartqueue.sdk.api.dto.*
import retrofit2.http.*

interface SmartQueueApiService {

    @GET("api/v1/queues/{queueId}")
    suspend fun getQueueStatus(
        @Path("queueId") queueId: String
    ): QueueStatusDto

    @POST("api/v1/queues/{queueId}/join")
    suspend fun joinQueue(
        @Path("queueId") queueId: String,
        @Body body: JoinRequestDto
    ): JoinResponseDto

    @HTTP(method = "DELETE", path = "api/v1/queues/{queueId}/leave", hasBody = true)
    suspend fun leaveQueue(
        @Path("queueId") queueId: String,
        @Body body: LeaveRequestDto
    ): SuccessResponseDto

    @GET("api/v1/queues/{queueId}/my-ticket")
    suspend fun getMyTicket(
        @Path("queueId") queueId: String,
        @Query("customer_id") customerId: String
    ): TicketResponseDto
}
