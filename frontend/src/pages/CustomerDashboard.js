import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import api from "../api";

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  const base = new Date(isoDate);
  if (Number.isNaN(base.getTime())) {
    return "";
  }
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

function generatePaymentReference(method) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  const prefix = method === "bank_transfer" ? "BT" : "MM";
  return `${prefix}-${stamp}-${rand}`;
}

function CustomerDashboard() {
  const location = useLocation();
  const bookingIntent = location.state?.bookingIntent || null;
  const bookingIntentApplied = useRef(false);

  const [checkIn, setCheckIn] = useState(todayPlus(0));
  const [stayDays, setStayDays] = useState(1);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [roomId, setRoomId] = useState("");
  const [me, setMe] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("mobile_money");
  const [paymentReference, setPaymentReference] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const checkOut = useMemo(() => addDays(checkIn, stayDays), [checkIn, stayDays]);
  const canSearch = useMemo(() => checkIn && stayDays > 0 && Boolean(checkOut), [checkIn, stayDays, checkOut]);
  const canBook = useMemo(() => canSearch && roomId && me?.customer_id, [canSearch, roomId, me]);
  const selectedRoom = useMemo(() => rooms.find((r) => String(r.id) === String(roomId)) || null, [rooms, roomId]);
  const totalPrice = useMemo(() => {
    if (!selectedRoom || stayDays <= 0) {
      return null;
    }
    const nightly = Number.parseFloat(selectedRoom.price);
    if (Number.isNaN(nightly)) {
      return null;
    }
    return (nightly * stayDays).toFixed(2);
  }, [selectedRoom, stayDays]);

  useEffect(() => {
    if (!bookingIntent || bookingIntentApplied.current) {
      return;
    }

    if (bookingIntent.checkIn) {
      setCheckIn(bookingIntent.checkIn);
    }
    if (bookingIntent.checkIn && bookingIntent.checkOut) {
      const days = Math.max(1, Math.round((new Date(bookingIntent.checkOut) - new Date(bookingIntent.checkIn)) / 86400000));
      setStayDays(days);
    }
    if (bookingIntent.roomId) {
      setRoomId(String(bookingIntent.roomId));
    }

    bookingIntentApplied.current = true;
    setMessage("Booking details loaded. Confirm to place your booking.");
  }, [bookingIntent]);

  const loadMyProfile = useCallback(() => {
    return api.get("/auth/me/").then((res) => setMe(res.data));
  }, []);

  const loadMyBookings = useCallback(() => {
    return api.get("/bookings/").then((res) => setBookings(res.data));
  }, []);

  const loadAvailableRooms = useCallback(() => {
    if (!canSearch) {
      setRooms([]);
      return Promise.resolve();
    }

    return api
      .get("/rooms/available/", {
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
    Promise.all([loadMyProfile(), loadMyBookings()]).catch(() => setError("Failed to load customer profile."));
  }, [loadMyProfile, loadMyBookings]);

  useEffect(() => {
    loadAvailableRooms().catch(() => setError("Failed to load available rooms."));
  }, [loadAvailableRooms]);

  const downloadReceipt = (bookingId) => {
    return api
      .get(`/bookings/${bookingId}/receipt/`, { responseType: "blob" })
      .then((res) => {
        const pdfBlob = new Blob([res.data], { type: "application/pdf" });
        const fileUrl = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = "receipt.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(fileUrl);
      });
  };

  const bookRoom = () => {
    if (!canBook) {
      setError("Select valid dates and room.");
      return;
    }

    if (!showPaymentForm) {
      setShowPaymentForm(true);
      setPaymentReference(generatePaymentReference(paymentMethod));
      setMessage("");
      setError("");
      return;
    }

    setError("");
    setMessage("");

    api
      .post("/bookings/", {
        room: roomId,
        check_in: checkIn,
        check_out: checkOut,
        payment_method: paymentMethod,
        payment_reference: paymentReference,
      })
      .then(() => {
        setRoomId("");
        setShowPaymentForm(false);
        setPaymentMethod("mobile_money");
        setPaymentReference("");
        setMessage("Room booked successfully.");
        return Promise.all([loadAvailableRooms(), loadMyBookings()]);
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

  const cancelBooking = (bookingId) => {
    setError("");
    setMessage("");

    api
      .delete(`/bookings/${bookingId}/`)
      .then(() => {
        setMessage("Booking cancelled successfully.");
        return Promise.all([loadAvailableRooms(), loadMyBookings()]);
      })
      .catch(() => {
        setError("Failed to cancel booking.");
      });
  };

  return (
    <section>
      <h2>Customer Dashboard</h2>

      <div className="card">
        <h3>View Available Rooms</h3>
        <div className="form-grid">
          <label>
            Check-in
            <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </label>
          <label>
            Days
            <input
              type="number"
              min="1"
              value={stayDays}
              onChange={(e) => setStayDays(Math.max(1, Number.parseInt(e.target.value || "1", 10) || 1))}
            />
          </label>
        </div>
        <p>
          Checkout date: <strong>{checkOut}</strong>
        </p>

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
        <h3>Book a Room</h3>
        <div className="form-grid">
          <label>
            Available rooms
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
            {showPaymentForm ? "Confirm Payment & Book" : "Book Room"}
          </button>
        </div>
        {showPaymentForm && (
          <div className="card">
            <h4>Payment</h4>
            <div className="form-grid">
              <label>
                Method
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    const method = e.target.value;
                    setPaymentMethod(method);
                    setPaymentReference(generatePaymentReference(method));
                  }}
                >
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </label>
              <label>
                {paymentMethod === "mobile_money" ? "Transaction ID" : "Transfer Reference"}
                <input
                  value={paymentReference}
                  readOnly
                />
              </label>
            </div>
          </div>
        )}
        {selectedRoom && (
          <p>
            Total: <strong>${totalPrice}</strong> ({selectedRoom.price} x {stayDays} day{stayDays > 1 ? "s" : ""})
          </p>
        )}
      </div>

      <div className="card">
        <h3>My Bookings ({bookings.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Room</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>{b.room_number}</td>
                <td>{b.check_in}</td>
                <td>{b.check_out}</td>
                <td>{new Date(b.created_at).toLocaleString()}</td>
                <td>
                  <button onClick={() => downloadReceipt(b.id)}>Download Receipt</button>
                  {" "}
                  <button className="danger-btn" onClick={() => cancelBooking(b.id)}>
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {message && <p>{message}</p>}
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}

export default CustomerDashboard;
