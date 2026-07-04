async def test_join_queue_success(client, queue):
    r = await client.post(
        f"/api/v1/queues/{queue['id']}/join",
        json={"customer_id": "c1", "customer_name": "Alice"},
    )
    assert r.status_code == 201
    data = r.json()
    assert data["ticket_number"] == 1
    assert data["position"] == 0
    assert data["status"] == "waiting"
    assert data["estimated_wait_seconds"] == 0


async def test_join_closed_queue(client, queue, admin_headers):
    await client.patch(
        f"/api/v1/admin/queues/{queue['id']}/status",
        json={"status": "closed"},
        headers=admin_headers,
    )
    r = await client.post(
        f"/api/v1/queues/{queue['id']}/join",
        json={"customer_id": "c1", "customer_name": "Alice"},
    )
    assert r.status_code == 409
    assert r.json()["detail"]["error"] == "QUEUE_CLOSED"


async def test_join_paused_queue(client, queue, admin_headers):
    await client.patch(
        f"/api/v1/admin/queues/{queue['id']}/status",
        json={"status": "paused"},
        headers=admin_headers,
    )
    r = await client.post(
        f"/api/v1/queues/{queue['id']}/join",
        json={"customer_id": "c1", "customer_name": "Alice"},
    )
    assert r.status_code == 409
    assert r.json()["detail"]["error"] == "QUEUE_CLOSED"


async def test_join_twice_same_customer(client, queue):
    await client.post(f"/api/v1/queues/{queue['id']}/join",
        json={"customer_id": "c1", "customer_name": "Alice"})
    r = await client.post(f"/api/v1/queues/{queue['id']}/join",
        json={"customer_id": "c1", "customer_name": "Alice"})
    assert r.status_code == 409
    assert r.json()["detail"]["error"] == "ALREADY_IN_QUEUE"


async def test_positions_correct_for_multiple_customers(client, queue):
    t1 = (await client.post(f"/api/v1/queues/{queue['id']}/join",
        json={"customer_id": "c1", "customer_name": "Alice"})).json()
    t2 = (await client.post(f"/api/v1/queues/{queue['id']}/join",
        json={"customer_id": "c2", "customer_name": "Bob"})).json()
    t3 = (await client.post(f"/api/v1/queues/{queue['id']}/join",
        json={"customer_id": "c3", "customer_name": "Carol"})).json()
    assert t1["position"] == 0
    assert t2["position"] == 1
    assert t3["position"] == 2
    assert t2["estimated_wait_seconds"] == 120
    assert t3["estimated_wait_seconds"] == 240


async def test_leave_queue_success(client, queue):
    await client.post(f"/api/v1/queues/{queue['id']}/join",
        json={"customer_id": "c1", "customer_name": "Alice"})
    r = await client.request("DELETE", f"/api/v1/queues/{queue['id']}/leave",
        json={"customer_id": "c1"})
    assert r.status_code == 200
    assert r.json()["success"] is True
    poll = await client.get(f"/api/v1/queues/{queue['id']}/my-ticket?customer_id=c1")
    assert poll.status_code == 404


async def test_leave_queue_no_ticket(client, queue):
    r = await client.request("DELETE", f"/api/v1/queues/{queue['id']}/leave",
        json={"customer_id": "nobody"})
    assert r.status_code == 404
    assert r.json()["detail"]["error"] == "NO_ACTIVE_TICKET"


async def test_poll_position_updates_after_leave(client, queue):
    await client.post(f"/api/v1/queues/{queue['id']}/join",
        json={"customer_id": "c1", "customer_name": "Alice"})
    await client.post(f"/api/v1/queues/{queue['id']}/join",
        json={"customer_id": "c2", "customer_name": "Bob"})
    # Alice leaves
    await client.request("DELETE", f"/api/v1/queues/{queue['id']}/leave",
        json={"customer_id": "c1"})
    # Bob should now be position 0
    r = await client.get(f"/api/v1/queues/{queue['id']}/my-ticket?customer_id=c2")
    assert r.status_code == 200
    assert r.json()["position"] == 0


async def test_poll_no_ticket(client, queue):
    r = await client.get(f"/api/v1/queues/{queue['id']}/my-ticket?customer_id=nobody")
    assert r.status_code == 404
    assert r.json()["detail"]["error"] == "NO_ACTIVE_TICKET"
