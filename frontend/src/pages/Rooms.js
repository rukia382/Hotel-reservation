import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

import API_BASE_URL from "../api";

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function Rooms() {
  const [checkIn, setCheckIn] = useState(todayPlus(0));
  const [checkOut, setCheckOut] = useState(todayPlus(1));
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSearch = useMemo(() => checkIn && checkOut && checkIn < checkOut, [checkIn, checkOut]);

  const fetchAvailableRooms = useCallback(() => {
    if (!canSearch) {
      setError("Please choose valid dates (check-out must be after check-in).");
      return;
    }

    setLoading(true);
    setError("");

    axios
      .get(`${API_BASE_URL}/rooms/available/`, {
        params: { check_in: checkIn, check_out: checkOut },
      })
      .then((res) => setRooms(res.data))
      .catch((err) => {
        const message = err.response?.data?.error || "Failed to load available rooms.";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [canSearch, checkIn, checkOut]);

  useEffect(() => {
    fetchAvailableRooms();
  }, [fetchAvailableRooms]);

  return (
    <section>
      <h2>View Available Rooms</h2>
      <div className="card form-grid">
        <label>
          Check-in
          <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </label>
        <label>
          Check-out
          <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </label>
        <button onClick={fetchAvailableRooms} disabled={!canSearch || loading}>
          {loading ? "Searching..." : "Search Rooms"}
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <h3>Results ({rooms.length})</h3>
        {rooms.length === 0 ? (
          <p>No rooms found for the selected dates.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Room</th>
                <th>Type</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td>{room.room_number}</td>
                  <td>{room.room_type}</td>
                  <td>${room.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default Rooms;
