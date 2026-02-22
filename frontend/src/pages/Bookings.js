import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

import API_BASE_URL from "../api";

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [room, setRoom] = useState("");
  const [customer, setCustomer] = useState("");
  const [checkIn, setCheckIn] = useState(todayPlus(0));
  const [checkOut, setCheckOut] = useState(todayPlus(1));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(
    () => room && customer && checkIn && checkOut && checkIn < checkOut,
    [room, customer, checkIn, checkOut]
  );

  const fetchBookings = useCallback(
    () => axios.get(`${API_BASE_URL}/bookings/`).then((res) => setBookings(res.data)),
    []
  );

  const fetchCustomers = useCallback(
    () => axios.get(`${API_BASE_URL}/customers/`).then((res) => setCustomers(res.data)),
    []
  );

  const fetchAvailableRooms = useCallback(() => {
    if (!checkIn || !checkOut || checkIn >= checkOut) {
      setRooms([]);
      return Promise.resolve();
    }

    return axios
      .get(`${API_BASE_URL}/rooms/available/`, {
        params: { check_in: checkIn, check_out: checkOut },
      })
      .then((res) => {
        setRooms(res.data);
        if (room && !res.data.some((r) => String(r.id) === String(room))) {
          setRoom("");
        }
      });
  }, [checkIn, checkOut, room]);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");

    Promise.all([fetchBookings(), fetchCustomers(), fetchAvailableRooms()])
      .catch(() => setError("Failed to load booking data."))
      .finally(() => setLoading(false));
  }, [fetchAvailableRooms, fetchBookings, fetchCustomers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchAvailableRooms().catch(() => setError("Failed to refresh available rooms."));
  }, [fetchAvailableRooms]);

  const addBooking = () => {
    if (!canSubmit) {
      setError("Fill all fields and select a valid date range.");
      return;
    }

    setError("");

    axios
      .post(`${API_BASE_URL}/bookings/`, {
        room,
        customer,
        check_in: checkIn,
        check_out: checkOut,
      })
      .then(() => {
        setRoom("");
        fetchData();
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

        setError("Booking failed. Please check room/date availability.");
      });
  };

  const cancelBooking = (id) => {
    axios
      .delete(`${API_BASE_URL}/bookings/${id}/`)
      .then(() => fetchData())
      .catch(() => setError("Failed to cancel booking."));
  };

  return (
    <section>
      <h2>Book and Cancel Rooms</h2>

      <div className="card form-grid">
        <label>
          Check-in
          <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </label>
        <label>
          Check-out
          <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </label>
        <label>
          Room
          <select value={room} onChange={(e) => setRoom(e.target.value)}>
            <option value="">Select room</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.room_number} ({r.room_type})
              </option>
            ))}
          </select>
        </label>
        <label>
          Customer
          <select value={customer} onChange={(e) => setCustomer(e.target.value)}>
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button disabled={!canSubmit || loading} onClick={addBooking}>
          Create Booking
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <h3>Current Bookings ({bookings.length})</h3>
        {bookings.length === 0 ? (
          <p>No bookings found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Room</th>
                <th>Customer</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.room_number}</td>
                  <td>{b.customer_name}</td>
                  <td>{b.check_in}</td>
                  <td>{b.check_out}</td>
                  <td>
                    <button className="danger-btn" onClick={() => cancelBooking(b.id)}>
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default Bookings;
