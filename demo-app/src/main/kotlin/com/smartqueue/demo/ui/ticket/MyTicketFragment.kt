package com.smartqueue.demo.ui.ticket

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.smartqueue.sdk.models.SmartQueueResult
import com.smartqueue.demo.R

class MyTicketFragment : Fragment() {

    private val viewModel: MyTicketViewModel by viewModels()

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.fragment_my_ticket, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val queueId      = requireArguments().getString("queueId")!!
        val customerName = requireArguments().getString("customerName", "")

        val tvCustomerName = view.findViewById<TextView>(R.id.tvCustomerName)
        val tvTicketNumber = view.findViewById<TextView>(R.id.tvTicketNumber)
        val tvPosition     = view.findViewById<TextView>(R.id.tvPosition)
        val tvWait         = view.findViewById<TextView>(R.id.tvWait)
        val tvTicketStatus = view.findViewById<TextView>(R.id.tvTicketStatus)
        val tvStatusBanner = view.findViewById<TextView>(R.id.tvStatusBanner)
        val tvError        = view.findViewById<TextView>(R.id.tvError)
        val btnLeave       = view.findViewById<Button>(R.id.btnLeave)

        if (customerName.isNotBlank()) {
            tvCustomerName.text = "Welcome, $customerName"
        }

        viewModel.startObservingIfNeeded(queueId)

        viewModel.ticketState.observe(viewLifecycleOwner) { result ->
            when (result) {
                is SmartQueueResult.Success -> {
                    val ticket = result.data
                    tvError.visibility = View.GONE
                    tvTicketNumber.text = "#${ticket.ticketNumber}"
                    tvPosition.text = positionText(ticket.position)
                    tvWait.text = formatWait(ticket.estimatedWaitSeconds)
                    tvTicketStatus.text = ticket.status

                    val nearlyThere = ticket.position <= 1 && ticket.status == "waiting"
                    tvStatusBanner.visibility = if (nearlyThere) View.VISIBLE else View.GONE
                }
                is SmartQueueResult.Error -> {
                    tvError.text = result.message
                    tvError.visibility = View.VISIBLE
                }
            }
        }

        viewModel.error.observe(viewLifecycleOwner) { msg ->
            if (msg != null) {
                tvError.text = msg
                tvError.visibility = View.VISIBLE
            }
        }

        viewModel.navigateToYourTurn.observe(viewLifecycleOwner) { ticketNumber ->
            if (ticketNumber != null) {
                findNavController().navigate(
                    R.id.action_myTicket_to_yourTurn,
                    bundleOf("ticketNumber" to ticketNumber, "customerName" to customerName)
                )
                viewModel.onNavigated()
            }
        }

        viewModel.navigateBack.observe(viewLifecycleOwner) { shouldGoBack ->
            if (shouldGoBack) {
                findNavController().popBackStack()
                viewModel.onNavigated()
            }
        }

        btnLeave.setOnClickListener {
            viewModel.leaveQueue(queueId)
        }
    }

    private fun positionText(position: Int): String = when (position) {
        0    -> "You're next!"
        1    -> "1 person ahead"
        else -> "$position people ahead"
    }

    private fun formatWait(seconds: Int): String {
        if (seconds < 60) return "$seconds sec"
        val m = seconds / 60.0
        return if (m == kotlin.math.floor(m)) "${m.toInt()} min" else String.format("%.1f min", m)
    }
}
