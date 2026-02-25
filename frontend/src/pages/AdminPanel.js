import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";

import { API_BASE_URL } from "../api";

const initialRoom = {
  room_number: "",
  room_type: "",
  price: "",
  is_available: true,
};

function AdminPanel() {
  const [customers, setCustomers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [newRoom, setNewRoom] = useState(initialRoom);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(() => {
    setError("");

    Promise.all([
      axios.get(`${API_BASE_URL}/customers/`),
      axios.get(`${API_BASE_URL}/rooms/`),
      axios.get(`${API_BASE_URL}/bookings/`),
      axios.get(`${API_BASE_URL}/transactions/`),
    ])
      .then(([customersRes, roomsRes, bookingsRes, transactionsRes]) => {
        setCustomers(customersRes.data);
        setRooms(roomsRes.data);
        setBookings(bookingsRes.data);
        setTransactions(transactionsRes.data);
      })
      .catch(() => setError("Failed to load admin data."));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addRoom = () => {
    if (!newRoom.room_number || !newRoom.room_type || !newRoom.price) {
      setError("Room number, room type, and price are required.");
      return;
    }

    setError("");
    setMessage("");

    axios
      .post(`${API_BASE_URL}/rooms/`, newRoom)
      .then(() => {
        setNewRoom(initialRoom);
        setMessage("Room added successfully.");
        loadData();
      })
      .catch(() => setError("Failed to add room. Ensure room number is unique."));
  };

  return (
    <section>
      <h2>Admin Portal</h2>

      <div className="card">
        <h3>Add Room</h3>
        <div className="form-grid">
          <label>
            Room Number
            <input
              value={newRoom.room_number}
              onChange={(e) => setNewRoom((r) => ({ ...r, room_number: e.target.value }))}
            />
          </label>
          <label>
            Room Type
            <input
              value={newRoom.room_type}
              onChange={(e) => setNewRoom((r) => ({ ...r, room_type: e.target.value }))}
            />
          </label>
          <label>
            Price
            <input
              type="number"
              min="0"
              step="0.01"
              value={newRoom.price}
              onChange={(e) => setNewRoom((r) => ({ ...r, price: e.target.value }))}
            />
          </label>
          <button onClick={addRoom}>Add Room</button>
        </div>
      </div>

      {message && <p>{message}</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <h3>Registered Customers ({customers.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>National ID</th>
              <th>Total Bookings</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phone}</td>
                <td>{c.national_id}</td>
                <td>{c.total_bookings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>All Rooms ({rooms.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Room</th>
              <th>Type</th>
              <th>Price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id}>
                <td>{room.room_number}</td>
                <td>{room.room_type}</td>
                <td>${room.price}</td>
                <td>{room.is_available ? "Available" : "Booked"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Bookings ({bookings.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Room</th>
              <th>Customer</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>{b.room_number}</td>
                <td>{b.customer_name}</td>
                <td>{b.check_in}</td>
                <td>{b.check_out}</td>
                <td>{new Date(b.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Transactions ({transactions.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Amount</th>
              <th>Details</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td>{t.transaction_type}</td>
                <td>${t.amount}</td>
                <td>{t.note}</td>
                <td>{new Date(t.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AdminPanel;
