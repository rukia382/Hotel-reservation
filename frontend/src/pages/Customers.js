import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

import API_BASE_URL from "../api";

const initialForm = {
  name: "",
  phone: "",
  national_id: "",
};

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  const fetchCustomers = useCallback(() => {
    setLoading(true);
    setError("");

    axios
      .get(`${API_BASE_URL}/customers/`)
      .then((res) => {
        setCustomers(res.data);
        setSelectedCustomerId((prevId) => {
          if (prevId && !res.data.some((c) => c.id === prevId)) {
            return null;
          }
          return prevId;
        });
      })
      .catch(() => setError("Failed to load customers."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const onInput = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setSelectedCustomerId(null);
  };

  const startEdit = (customer) => {
    setSelectedCustomerId(customer.id);
    setForm({
      name: customer.name,
      phone: customer.phone,
      national_id: customer.national_id,
    });
  };

  const submitForm = () => {
    if (!form.name || !form.phone || !form.national_id) {
      setError("Name, phone, and ID are required.");
      return;
    }

    setError("");

    const payload = {
      name: form.name,
      phone: form.phone,
      national_id: form.national_id,
    };

    const request = selectedCustomerId
      ? axios.put(`${API_BASE_URL}/customers/${selectedCustomerId}/`, payload)
      : axios.post(`${API_BASE_URL}/customers/`, payload);

    request
      .then(() => {
        resetForm();
        fetchCustomers();
      })
      .catch((err) => {
        const apiError = err.response?.data;
        if (apiError?.national_id?.length) {
          setError(apiError.national_id[0]);
          return;
        }
        setError("Failed to save customer details.");
      });
  };

  const deleteCustomer = (id) => {
    axios
      .delete(`${API_BASE_URL}/customers/${id}/`)
      .then(() => {
        if (selectedCustomerId === id) {
          resetForm();
        }
        fetchCustomers();
      })
      .catch(() => setError("Failed to delete customer."));
  };

  return (
    <section>
      <h2>Manage Customer Details</h2>

      <div className="card form-grid">
        <label>
          Full name
          <input value={form.name} onChange={(e) => onInput("name", e.target.value)} />
        </label>
        <label>
          Phone number
          <input value={form.phone} onChange={(e) => onInput("phone", e.target.value)} />
        </label>
        <label>
          National ID
          <input value={form.national_id} onChange={(e) => onInput("national_id", e.target.value)} />
        </label>

        <div className="inline-actions">
          <button onClick={submitForm}>{selectedCustomerId ? "Update Customer" : "Add Customer"}</button>
          {selectedCustomerId && (
            <button className="secondary-btn" onClick={resetForm}>
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>Loading customers...</p>}

      <div className="card">
        <h3>Customers ({customers.length})</h3>
        {customers.length === 0 ? (
          <p>No customers found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>ID</th>
                <th>Total Bookings</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.national_id}</td>
                  <td>{c.total_bookings}</td>
                  <td>
                    <button className="secondary-btn" onClick={() => startEdit(c)}>
                      Edit
                    </button>
                    <button className="danger-btn" onClick={() => deleteCustomer(c.id)}>
                      Delete
                    </button>
                    <button className="secondary-btn" onClick={() => setSelectedCustomerId(c.id)}>
                      History
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>
          Booking History
          {selectedCustomer ? `: ${selectedCustomer.name}` : ""}
        </h3>
        {!selectedCustomer ? (
          <p>Select a customer to view booking history.</p>
        ) : selectedCustomer.booking_history.length === 0 ? (
          <p>This customer has no bookings yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Room</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {selectedCustomer.booking_history.map((b) => (
                <tr key={b.id}>
                  <td>{b.room_number}</td>
                  <td>{b.check_in}</td>
                  <td>{b.check_out}</td>
                  <td>{new Date(b.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default Customers;

