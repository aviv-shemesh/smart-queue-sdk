package com.smartqueue.demo.ui.yourturn

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.smartqueue.demo.R

class YourTurnFragment : Fragment() {

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.fragment_your_turn, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val ticketNumber = arguments?.getInt("ticketNumber", 0) ?: 0
        val customerName = arguments?.getString("customerName", "") ?: ""

        view.findViewById<TextView>(R.id.tvTicketNumber).text = "Ticket #$ticketNumber"

        view.findViewById<Button>(R.id.btnDone).setOnClickListener {
            findNavController().navigate(R.id.action_yourTurn_to_home)
        }
    }
}
