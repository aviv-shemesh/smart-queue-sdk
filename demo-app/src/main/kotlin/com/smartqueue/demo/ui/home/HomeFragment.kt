package com.smartqueue.demo.ui.home

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.smartqueue.demo.R

class HomeFragment : Fragment() {

    private val viewModel: HomeViewModel by viewModels()

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.fragment_home, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val etCustomerName = view.findViewById<EditText>(R.id.etCustomerName)
        val etQueueId      = view.findViewById<EditText>(R.id.etQueueId)
        val btnJoin        = view.findViewById<Button>(R.id.btnJoin)
        val btnStatus      = view.findViewById<Button>(R.id.btnStatus)
        val tvError        = view.findViewById<TextView>(R.id.tvError)

        btnJoin.setOnClickListener {
            viewModel.joinQueue(
                queueId      = etQueueId.text.toString().trim(),
                customerName = etCustomerName.text.toString().trim()
            )
        }

        btnStatus.setOnClickListener {
            viewModel.viewStatus(etQueueId.text.toString().trim())
        }

        viewModel.error.observe(viewLifecycleOwner) { msg ->
            tvError.text = msg ?: ""
            tvError.visibility = if (msg != null) View.VISIBLE else View.GONE
        }

        viewModel.navigateToTicket.observe(viewLifecycleOwner) { join ->
            if (join != null) {
                findNavController().navigate(
                    R.id.action_home_to_myTicket,
                    bundleOf("queueId" to join.queueId, "customerName" to join.customerName)
                )
                viewModel.onNavigated()
            }
        }

        viewModel.navigateToStatus.observe(viewLifecycleOwner) { queueId ->
            if (queueId != null) {
                findNavController().navigate(
                    R.id.action_home_to_queueStatus,
                    bundleOf("queueId" to queueId)
                )
                viewModel.onNavigated()
            }
        }
    }
}
