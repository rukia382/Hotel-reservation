import React, { useCallback, useEffect, useState } from "react";

import api from "../api";

const ROOM_TYPES = ["Single", "Double", "Deluxe", "Suite", "Family"];

const initialRoom = {
  room_number: "",
  room_type: "",
  price: "",
  is_available: true,
};

function AdminDashboard() {
  const [customers, setCustomers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [newRoom, setNewRoom] = useState(initialRoom);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [editingRoom, setEditingRoom] = useState({
    room_number: "",
    room_type: "",
    price: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(() => {
    setError("");

    Promise.all([
      api.get("/customers/"),
      api.get("/rooms/"),
      api.get("/bookings/"),
      api.get("/transactions/"),
    ])
      .then(([customersRes, roomsRes, bookingsRes, transactionsRes]) => {
        setCustomers(customersRes.data);
        setRooms(roomsRes.data);
        setBookings(bookingsRes.data);
        setTransactions(transactionsRes.data);
      })
      .catch(() => setError("Failed to load admin dashboard data."));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addRoom = () => {
    if (!newRoom.room_number || !newRoom.room_type || !newRoom.price) {
      setError("Room number, type, and price are required.");
      return;
    }

    setError("");
    setMessage("");

    api
      .post("/rooms/", newRoom)
      .then(() => {
        setNewRoom(initialRoom);
        setMessage("Room added successfully.");
        loadData();
      })
      .catch(() => setError("Failed to add room. Ensure room number is unique."));
  };

  const startEditRoom = (room) => {
    setEditingRoomId(room.id);
    setEditingRoom({
      room_number: room.room_number,
      room_type: room.room_type,
      price: room.price,
    });
    setError("");
    setMessage("");
  };

  const saveRoomEdit = (roomId) => {
    if (!editingRoom.room_number || !editingRoom.room_type || !editingRoom.price) {
      setError("Room number, type, and price are required.");
      return;
    }

    setError("");
    setMessage("");

    api
      .patch(`/rooms/${roomId}/`, editingRoom)
      .then(() => {
        setEditingRoomId(null);
        setEditingRoom({ room_number: "", room_type: "", price: "" });
        setMessage("Room updated successfully.");
        loadData();
      })
      .catch(() => setError("Failed to update room."));
  };

  const deleteRoom = (roomId) => {
    if (!window.confirm("Delete this room?")) {
      return;
    }

    setError("");
    setMessage("");

    api
      .delete(`/rooms/${roomId}/`)
      .then(() => {
        if (editingRoomId === roomId) {
          setEditingRoomId(null);
          setEditingRoom({ room_number: "", room_type: "", price: "" });
        }
        setMessage("Room deleted successfully.");
        loadData();
      })
      .catch(() => setError("Failed to delete room."));
  };

  return (
    <section>
      <h2>Admin Dashboard</h2>

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
            <select
              value={newRoom.room_type}
              onChange={(e) => setNewRoom((r) => ({ ...r, room_type: e.target.value }))}
            >
              <option value="">Select room type</option>
              {ROOM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
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
        <h3>All Rooms ({rooms.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Room</th>
              <th>Type</th>
              <th>Price</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id}>
                <td>
                  {editingRoomId === room.id ? (
                    <input
                      value={editingRoom.room_number}
                      onChange={(e) => setEditingRoom((r) => ({ ...r, room_number: e.target.value }))}
                    />
                  ) : (
                    room.room_number
                  )}
                </td>
                <td>
                  {editingRoomId === room.id ? (
                    <select
                      value={editingRoom.room_type}
                      onChange={(e) => setEditingRoom((r) => ({ ...r, room_type: e.target.value }))}
                    >
                      {!ROOM_TYPES.includes(editingRoom.room_type) && editingRoom.room_type ? (
                        <option value={editingRoom.room_type}>{editingRoom.room_type}</option>
                      ) : null}
                      {ROOM_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  ) : (
                    room.room_type
                  )}
                </td>
                <td>
                  {editingRoomId === room.id ? (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingRoom.price}
                      onChange={(e) => setEditingRoom((r) => ({ ...r, price: e.target.value }))}
                    />
                  ) : (
                    `$${room.price}`
                  )}
                </td>
                <td>
                  {room.is_available ? (
                    "Available"
                  ) : (
                    "Booked"
                  )}
                </td>
                <td>
                  {editingRoomId === room.id ? (
                    <>
                      <button onClick={() => saveRoomEdit(room.id)}>Save</button>
                      {" "}
                      <button
                        onClick={() => {
                          setEditingRoomId(null);
                          setEditingRoom({ room_number: "", room_type: "", price: "" });
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEditRoom(room)}>Edit</button>
                      {" "}
                      <button className="danger-btn" onClick={() => deleteRoom(room.id)}>
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

export default AdminDashboard;
