package com.smartqueue.demo.ui.ticket

import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartqueue.sdk.SmartQueueSDK
import com.smartqueue.sdk.models.QueueTicket
import com.smartqueue.sdk.models.SmartQueueResult
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

class MyTicketViewModel : ViewModel() {

    val ticketState = MutableLiveData<SmartQueueResult<QueueTicket>>()
    val navigateToYourTurn = MutableLiveData<Int?>(null)
    val navigateBack = MutableLiveData(false)
    val error = MutableLiveData<String?>(null)

    private var pollingJob: Job? = null

    fun startObservingIfNeeded(queueId: String) {
        if (pollingJob?.isActive == true) return
        pollingJob = viewModelScope.launch {
            SmartQueueSDK.observePosition(queueId).collect { result ->
                ticketState.postValue(result)
                if (result is SmartQueueResult.Success && result.data.status == "called") {
                    navigateToYourTurn.postValue(result.data.ticketNumber)
                    pollingJob?.cancel()
                }
            }
        }
    }

    fun leaveQueue(queueId: String) {
        viewModelScope.launch {
            when (val result = SmartQueueSDK.leaveQueue(queueId)) {
                is SmartQueueResult.Success -> {
                    pollingJob?.cancel()
                    navigateBack.postValue(true)
                }
                is SmartQueueResult.Error -> {
                    error.postValue("${result.code}: ${result.message}")
                }
            }
        }
    }

    fun onNavigated() {
        navigateToYourTurn.value = null
        navigateBack.value = false
    }

    override fun onCleared() {
        super.onCleared()
        pollingJob?.cancel()
    }
}
