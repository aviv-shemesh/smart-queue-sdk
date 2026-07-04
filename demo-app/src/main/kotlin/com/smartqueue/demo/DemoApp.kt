package com.smartqueue.demo

import android.app.Application
import com.smartqueue.sdk.SmartQueueConfig
import com.smartqueue.sdk.SmartQueueSDK

class DemoApp : Application() {
    override fun onCreate() {
        super.onCreate()
        SmartQueueSDK.init(
            context = this,
            config = SmartQueueConfig(
                baseUrl = "http://10.0.2.2:8000/",
                enableLogging = true
            )
        )
    }
}
