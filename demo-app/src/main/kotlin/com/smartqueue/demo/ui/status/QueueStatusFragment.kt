package com.smartqueue.demo.ui.status

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.smartqueue.sdk.models.SmartQueueResult
import com.smartqueue.demo.R

class QueueStatusFragment : Fragment() {

    private val viewModel: QueueStatusViewModel by viewModels()

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.fragment_queue_status, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val queueId       = requireArguments().getString("queueId")!!
        val tvName        = view.findViewById<TextView>(R.id.tvName)
        val tvQueueStatus = view.findViewById<TextView>(R.id.tvQueueStatus)
        val tvNowServing  = view.findViewById<TextView>(R.id.tvNowServing)
        val tvWaitingCount = view.findViewById<TextView>(R.id.tvWaitingCount)
        val tvAvgTime     = view.findViewById<TextView>(R.id.tvAvgTime)
        val tvError       = view.findViewById<TextView>(R.id.tvError)
        val btnRefresh    = view.findViewById<Button>(R.id.btnRefresh)

        viewModel.statusState.observe(viewLifecycleOwner) { result ->
            when (result) {
                is SmartQueueResult.Success -> {
                    val s = result.data
                    tvError.visibility = View.GONE
                    tvName.text        = s.name
                    tvQueueStatus.text = s.status
                    tvNowServing.text  = "#${s.nowServing}"
                    tvWaitingCount.text = "${s.waitingCount}"
                    tvAvgTime.text     = formatServiceTime(s.averageServiceTimeSeconds)
                }
                is SmartQueueResult.Error -> {
                    tvError.text = result.message
                    tvError.visibility = View.VISIBLE
                }
            }
        }

        btnRefresh.setOnClickListener { viewModel.loadStatus(queueId) }
        viewModel.loadStatus(queueId)
    }

    private fun formatServiceTime(seconds: Int): String {
        if (seconds < 60) return "$seconds sec"
        val m = seconds / 60.0
        return if (m == kotlin.math.floor(m)) "${m.toInt()} min" else String.format("%.1f min", m)
    }
}
