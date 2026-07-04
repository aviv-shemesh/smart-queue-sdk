async def test_call_next_success(client, queue, admin_headers):
    await client.post(f"/api/v1/queues/{queue['id']}/join",
        json={"customer_id": "c1", "customer_name": "Alice"})
    r = await client.post(f"/api/v1/admin/queues/{queue['id']}/call-next",
        headers=admin_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["called_ticket_number"] == 1
    assert data["customer_name"] == "Alice"
    assert data["remaining_waiting"] == 0


async def test_call_next_updates_poll_status(client, queue, admin_headers):
    await client.post(f"/api/v1/queues/{queue['id']}/join",
        json={"customer_id": "c1", "customer_name": "Alice"})
    await client.post(f"/api/v1/admin/queues/{queue['id']}/call-next",
        headers=admin_headers)
    r = await client.get(f"/api/v1/queues/{queue['id']}/my-ticket?customer_id=c1")
    assert r.status_code == 200
    assert r.json()["status"] == "called"


async def test_call_next_promotes_position(client, queue, admin_headers):
    await client.post(f"/api/v1/queues/{queue['id']}/join",
        json={"customer_id": "c1", "customer_name": "Alice"})
    await client.post(f"/api/v1/queues/{queue['id']}/join",
        json={"customer_id": "c2", "customer_name": "Bob"})
    await client.post(f"/api/v1/admin/queues/{queue['id']}/call-next",
        headers=admin_headers)
    r = await client.get(f"/api/v1/queues/{queue['id']}/my-ticket?customer_id=c2")
    assert r.json()["position"] == 0


async def test_call_next_empty_queue(client, queue, admin_headers):
    r = await client.post(f"/api/v1/admin/queues/{queue['id']}/call-next",
        headers=admin_headers)
    assert r.status_code == 404
    assert r.json()["detail"]["error"] == "NO_WAITING_TICKETS"


async def test_waiting_list_order(client, queue, admin_headers):
    for i, name in enumerate(["Alice", "Bob", "Carol"], 1):
        await client.post(f"/api/v1/queues/{queue['id']}/join",
            json={"customer_id": f"c{i}", "customer_name": name})
    r = await client.get(f"/api/v1/admin/queues/{queue['id']}/waiting-list",
        headers=admin_headers)
    assert r.status_code == 200
    names = [t["customer_name"] for t in r.json()]
    assert names == ["Alice", "Bob", "Carol"]


async def test_waiting_list_excludes_called(client, queue, admin_headers):
    await client.post(f"/api/v1/queues/{queue['id']}/join",
        json={"customer_id": "c1", "customer_name": "Alice"})
    await client.post(f"/api/v1/queues/{queue['id']}/join",
        json={"customer_id": "c2", "customer_name": "Bob"})
    await client.post(f"/api/v1/admin/queues/{queue['id']}/call-next",
        headers=admin_headers)
    r = await client.get(f"/api/v1/admin/queues/{queue['id']}/waiting-list",
        headers=admin_headers)
    names = [t["customer_name"] for t in r.json()]
    assert names == ["Bob"]


async def test_waiting_list_unauthorized(client, queue):
    r = await client.get(f"/api/v1/admin/queues/{queue['id']}/waiting-list")
    assert r.status_code == 401
