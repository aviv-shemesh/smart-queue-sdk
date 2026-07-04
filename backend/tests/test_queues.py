async def test_create_queue_success(client, admin_headers):
    r = await client.post(
        "/api/v1/admin/queues",
        json={"name": "Main Counter", "average_service_time_seconds": 120},
        headers=admin_headers,
    )
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Main Counter"
    assert data["status"] == "open"
    assert data["waiting_count"] == 0
    assert "id" in data


async def test_create_queue_unauthorized(client):
    r = await client.post(
        "/api/v1/admin/queues",
        json={"name": "Test"},
    )
    assert r.status_code == 401


async def test_get_queue_not_found(client):
    r = await client.get("/api/v1/queues/000000000000000000000000")
    assert r.status_code == 404
    assert r.json()["detail"]["error"] == "QUEUE_NOT_FOUND"


async def test_get_queue_returns_waiting_count(client, queue):
    await client.post(
        f"/api/v1/queues/{queue['id']}/join",
        json={"customer_id": "c1", "customer_name": "Alice"},
    )
    r = await client.get(f"/api/v1/queues/{queue['id']}")
    assert r.status_code == 200
    assert r.json()["waiting_count"] == 1


async def test_update_status_to_paused(client, queue, admin_headers):
    r = await client.patch(
        f"/api/v1/admin/queues/{queue['id']}/status",
        json={"status": "paused"},
        headers=admin_headers,
    )
    assert r.status_code == 200
    assert r.json()["status"] == "paused"


async def test_update_status_invalid(client, queue, admin_headers):
    r = await client.patch(
        f"/api/v1/admin/queues/{queue['id']}/status",
        json={"status": "flying"},
        headers=admin_headers,
    )
    assert r.status_code == 400


async def test_list_open_queues(client, admin_headers):
    await client.post("/api/v1/admin/queues",
        json={"name": "Q1", "average_service_time_seconds": 60}, headers=admin_headers)
    await client.post("/api/v1/admin/queues",
        json={"name": "Q2", "average_service_time_seconds": 60}, headers=admin_headers)
    r = await client.get("/api/v1/admin/queues", headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()) >= 2
