import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../api";

const ROOM_TYPE_IMAGES = {
  single:
    "https://images.unsplash.com/photo-1631049552240-59c37f38802b?auto=format&fit=crop&w=1200&q=80",
  double:
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
  deluxe:
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
  suite:
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
  family:
    "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80",
  default:
    "https://images.unsplash.com/photo-1616594039964-3f0d39f9f8f2?auto=format&fit=crop&w=1200&q=80",
};

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function PublicHome() {
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState(todayPlus(0));
  const [checkOut, setCheckOut] = useState(todayPlus(1));
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState("");

  const canSearch = useMemo(() => checkIn && checkOut && checkIn < checkOut, [checkIn, checkOut]);

  const loadAvailableRooms = useCallback(() => {
    if (!canSearch) {
      setRooms([]);
      setError("Check-out must be later than check-in.");
      return;
    }

    setError("");

    api
      .get("/rooms/available/", {
        params: { check_in: checkIn, check_out: checkOut },
      })
      .then((res) => setRooms(res.data))
      .catch((err) => setError(err.response?.data?.error || "Failed to load available rooms."));
  }, [canSearch, checkIn, checkOut]);

  useEffect(() => {
    loadAvailableRooms();
  }, [loadAvailableRooms]);

  const startBooking = (room) => {
    const bookingIntent = {
      roomId: String(room.id),
      checkIn,
      checkOut,
    };
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (token && role === "customer") {
      navigate("/customer", { state: { bookingIntent } });
      return;
    }

    navigate("/login", { state: { bookingIntent } });
  };

  const roomImage = (roomType) => {
    if (!roomType) return ROOM_TYPE_IMAGES.default;
    const normalizedType = roomType.trim().toLowerCase();
    return ROOM_TYPE_IMAGES[normalizedType] || ROOM_TYPE_IMAGES.default;
  };

  return (
    <section>
      <h2>Available Rooms</h2>
      <p>
        Choose your dates, review room type and price, then click <strong>Book</strong>.
      </p>

      <div className="card form-grid">
        <label>
          Check-in
          <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </label>
        <label>
          Check-out
          <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </label>
        <button onClick={loadAvailableRooms} disabled={!canSearch}>
          Refresh Rooms
        </button>
      </div>

      <div className="room-grid">
        {rooms.map((room) => (
          <article className="room-card" key={room.id}>
            <img
              className="room-card-image"
              src={roomImage(room.room_type)}
              alt={`${room.room_type || "Hotel"} room`}
              loading="lazy"
            />
            <div className="room-card-info">
              <h3>Room {room.room_number}</h3>
              <p>
                <strong>Type:</strong> {room.room_type}
              </p>
              <p>
                <strong>Price:</strong> ${room.price}
              </p>
              <button onClick={() => startBooking(room)}>Book</button>
            </div>
          </article>
        ))}
      </div>
      {rooms.length === 0 && <p className="card">No rooms available for selected dates.</p>}

      <p>
        To complete booking, please <Link to="/login">Login</Link> or <Link to="/register">Sign up</Link>.
      </p>
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}

export default PublicHome;
