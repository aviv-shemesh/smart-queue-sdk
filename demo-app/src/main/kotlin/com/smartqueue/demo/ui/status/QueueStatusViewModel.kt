package com.smartqueue.demo.ui.status

import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartqueue.sdk.SmartQueueSDK
import com.smartqueue.sdk.models.QueueStatus
import com.smartqueue.sdk.models.SmartQueueResult
import kotlinx.coroutines.launch

class QueueStatusViewModel : ViewModel() {

    val statusState = MutableLiveData<SmartQueueResult<QueueStatus>>()

    fun loadStatus(queueId: String) {
        viewModelScope.launch {
            statusState.postValue(SmartQueueSDK.getQueueStatus(queueId))
        }
    }
}
