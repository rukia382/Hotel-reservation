import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

import API_BASE_URL from "../api";

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function CustomerPortal() {
  const [checkIn, setCheckIn] = useState(todayPlus(0));
  const [checkOut, setCheckOut] = useState(todayPlus(1));
  const [rooms, setRooms] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [roomId, setRoomId] = useState("");

  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", national_id: "" });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canSearch = useMemo(() => checkIn && checkOut && checkIn < checkOut, [checkIn, checkOut]);
  const canBook = useMemo(
    () => canSearch && customerId && roomId,
    [canSearch, customerId, roomId]
  );

  const loadCustomers = useCallback(() => {
    return axios.get(`${API_BASE_URL}/customers/`).then((res) => setCustomers(res.data));
  }, []);

  const loadAvailableRooms = useCallback(() => {
    if (!canSearch) {
      setRooms([]);
      return Promise.resolve();
    }

    return axios
      .get(`${API_BASE_URL}/rooms/available/`, {
        params: { check_in: checkIn, check_out: checkOut },
      })
      .then((res) => {
        setRooms(res.data);
        if (roomId && !res.data.some((r) => String(r.id) === String(roomId))) {
          setRoomId("");
        }
      });
  }, [canSearch, checkIn, checkOut, roomId]);

  useEffect(() => {
    loadCustomers().catch(() => setError("Failed to load customers."));
  }, [loadCustomers]);

  useEffect(() => {
    loadAvailableRooms().catch(() => setError("Failed to load available rooms."));
  }, [loadAvailableRooms]);

  const registerCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone || !newCustomer.national_id) {
      setError("Fill all customer fields.");
      return;
    }

    setError("");
    setMessage("");

    axios
      .post(`${API_BASE_URL}/customers/`, newCustomer)
      .then((res) => {
        setNewCustomer({ name: "", phone: "", national_id: "" });
        setCustomerId(String(res.data.id));
        setMessage("Customer registered. You can now book a room.");
        return loadCustomers();
      })
      .catch((err) => {
        const serverMessage = err.response?.data?.national_id?.[0] || "Failed to register customer.";
        setError(serverMessage);
      });
  };

  const bookRoom = () => {
    if (!canBook) {
      setError("Select valid dates, customer, and room.");
      return;
    }

    setError("");
    setMessage("");

    axios
      .post(`${API_BASE_URL}/bookings/`, {
        room: roomId,
        customer: customerId,
        check_in: checkIn,
        check_out: checkOut,
      })
      .then(() => {
        setRoomId("");
        setMessage("Room booked successfully.");
        return loadAvailableRooms();
      })
      .catch((err) => {
        const serverError = err.response?.data;
        if (typeof serverError === "string") {
          setError(serverError);
          return;
        }
        if (Array.isArray(serverError?.non_field_errors) && serverError.non_field_errors.length > 0) {
          setError(serverError.non_field_errors[0]);
          return;
        }
        setError("Booking failed. Please try again.");
      });
  };

  return (
    <section>
      <h2>Customer Portal</h2>

      <div className="card">
        <h3>1. View Available Rooms</h3>
        <div className="form-grid">
          <label>
            Check-in
            <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </label>
          <label>
            Check-out
            <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </label>
        </div>

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
        {rooms.length === 0 && <p>No rooms available for selected dates.</p>}
      </div>

      <div className="card">
        <h3>2. Register / Select Customer</h3>
        <div className="form-grid">
          <label>
            Name
            <input
              value={newCustomer.name}
              onChange={(e) => setNewCustomer((v) => ({ ...v, name: e.target.value }))}
            />
          </label>
          <label>
            Phone
            <input
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer((v) => ({ ...v, phone: e.target.value }))}
            />
          </label>
          <label>
            National ID
            <input
              value={newCustomer.national_id}
              onChange={(e) => setNewCustomer((v) => ({ ...v, national_id: e.target.value }))}
            />
          </label>
          <button onClick={registerCustomer}>Register Customer</button>
        </div>

        <label>
          Or select existing customer
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="card">
        <h3>3. Book Room</h3>
        <div className="form-grid">
          <label>
            Available room
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">Select room</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.room_number} ({r.room_type}) - ${r.price}
                </option>
              ))}
            </select>
          </label>
          <button onClick={bookRoom} disabled={!canBook}>
            Book Room
          </button>
        </div>
      </div>

      {message && <p>{message}</p>}
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}

export default CustomerPortal;
