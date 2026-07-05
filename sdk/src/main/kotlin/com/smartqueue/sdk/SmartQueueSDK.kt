package com.smartqueue.sdk

import android.content.Context
import com.smartqueue.sdk.api.NetworkClient
import com.smartqueue.sdk.api.dto.JoinRequestDto
import com.smartqueue.sdk.api.dto.LeaveRequestDto
import com.smartqueue.sdk.internal.CustomerIdManager
import com.smartqueue.sdk.internal.ErrorMapper
import com.smartqueue.sdk.models.QueueStatus
import com.smartqueue.sdk.models.QueueTicket
import com.smartqueue.sdk.models.SmartQueueResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn

object SmartQueueSDK {

    private var customerId: String = ""

    fun init(context: Context, config: SmartQueueConfig) {
        NetworkClient.init(config.baseUrl, config.enableLogging)
        customerId = config.customerId ?: CustomerIdManager.getOrCreate(context)
    }

    fun getCustomerId(): String = customerId

    suspend fun joinQueue(
        queueId: String,
        customerName: String
    ): SmartQueueResult<QueueTicket> {
        return try {
            val dto = NetworkClient.api().joinQueue(
                queueId,
                JoinRequestDto(customer_id = customerId, customer_name = customerName)
            )
            SmartQueueResult.Success(
                QueueTicket(
                    ticketId = dto.ticket_id,
                    ticketNumber = dto.ticket_number,
                    status = dto.status,
                    position = dto.position,
                    estimatedWaitSeconds = dto.estimated_wait_seconds
                )
            )
        } catch (e: Exception) {
            ErrorMapper.map(e)
        }
    }

    suspend fun leaveQueue(queueId: String): SmartQueueResult<Unit> {
        return try {
            NetworkClient.api().leaveQueue(queueId, LeaveRequestDto(customer_id = customerId))
            SmartQueueResult.Success(Unit)
        } catch (e: Exception) {
            ErrorMapper.map(e)
        }
    }

    fun observePosition(
        queueId: String,
        intervalSeconds: Int = 10
    ): Flow<SmartQueueResult<QueueTicket>> = flow {
        while (true) {
            val result = fetchMyTicket(queueId)
            emit(result)
            when {
                result is SmartQueueResult.Success &&
                    result.data.status in listOf("served", "cancelled") -> break
                // Ticket no longer exists in the queue (was cancelled externally
                // or the queue was reset). Stop polling — caller handles navigation.
                result is SmartQueueResult.Error &&
                    result.code == "NO_ACTIVE_TICKET" -> break
            }
            delay(intervalSeconds * 1000L)
        }
    }.flowOn(Dispatchers.IO)

    suspend fun getQueueStatus(queueId: String): SmartQueueResult<QueueStatus> {
        return try {
            val dto = NetworkClient.api().getQueueStatus(queueId)
            SmartQueueResult.Success(
                QueueStatus(
                    id = dto.id,
                    name = dto.name,
                    status = dto.status,
                    nowServing = dto.now_serving,
                    waitingCount = dto.waiting_count,
                    averageServiceTimeSeconds = dto.average_service_time_seconds
                )
            )
        } catch (e: Exception) {
            ErrorMapper.map(e)
        }
    }

    private suspend fun fetchMyTicket(queueId: String): SmartQueueResult<QueueTicket> {
        return try {
            val dto = NetworkClient.api().getMyTicket(queueId, customerId)
            SmartQueueResult.Success(
                QueueTicket(
                    ticketId = dto.ticket_id,
                    ticketNumber = dto.ticket_number,
                    status = dto.status,
                    position = dto.position,
                    estimatedWaitSeconds = dto.estimated_wait_seconds
                )
            )
        } catch (e: Exception) {
            ErrorMapper.map(e)
        }
    }
}
