package com.smartqueue.demo.ui.home

import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartqueue.sdk.SmartQueueSDK
import com.smartqueue.sdk.models.SmartQueueResult
import kotlinx.coroutines.launch

data class JoinResult(val queueId: String, val customerName: String)

class HomeViewModel : ViewModel() {

    val navigateToTicket = MutableLiveData<JoinResult?>(null)
    val navigateToStatus = MutableLiveData<String?>(null)
    val error = MutableLiveData<String?>(null)

    fun joinQueue(queueId: String, customerName: String) {
        if (customerName.isBlank()) {
            error.value = "Please enter your name"
            return
        }
        if (queueId.isBlank()) {
            error.value = "Please enter a Queue ID"
            return
        }
        error.value = null
        viewModelScope.launch {
            when (val result = SmartQueueSDK.joinQueue(queueId, customerName.trim())) {
                is SmartQueueResult.Success -> {
                    navigateToTicket.value = JoinResult(queueId, customerName.trim())
                }
                is SmartQueueResult.Error -> {
                    error.value = result.message
                }
            }
        }
    }

    fun viewStatus(queueId: String) {
        if (queueId.isBlank()) {
            error.value = "Please enter a Queue ID"
            return
        }
        error.value = null
        navigateToStatus.value = queueId
    }

    fun onNavigated() {
        navigateToTicket.value = null
        navigateToStatus.value = null
    }
}
