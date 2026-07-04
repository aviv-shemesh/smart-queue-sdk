package com.smartqueue.sdk.internal

import android.content.Context
import java.util.UUID

internal object CustomerIdManager {

    private const val PREF_NAME = "smartqueue_prefs"
    private const val KEY_CUSTOMER_ID = "customer_id"

    fun getOrCreate(context: Context): String {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        val existing = prefs.getString(KEY_CUSTOMER_ID, null)
        if (existing != null) return existing
        val new = UUID.randomUUID().toString()
        prefs.edit().putString(KEY_CUSTOMER_ID, new).apply()
        return new
    }
}
