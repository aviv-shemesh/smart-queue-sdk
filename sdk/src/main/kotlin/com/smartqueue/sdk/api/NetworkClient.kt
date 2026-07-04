package com.smartqueue.sdk.api

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

internal object NetworkClient {

    private var retrofit: Retrofit? = null

    fun init(baseUrl: String, enableLogging: Boolean) {
        val logging = HttpLoggingInterceptor().apply {
            level = if (enableLogging)
                HttpLoggingInterceptor.Level.BODY
            else
                HttpLoggingInterceptor.Level.NONE
        }
        val okHttp = OkHttpClient.Builder()
            .addInterceptor(logging)
            .build()

        retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttp)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    fun api(): SmartQueueApiService {
        return retrofit?.create(SmartQueueApiService::class.java)
            ?: error("SmartQueueSDK not initialized. Call SmartQueueSDK.init() first.")
    }
}
