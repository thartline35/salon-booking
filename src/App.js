import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import BookingForm from "./components/BookingForm";
import StylistDashboard from "./components/StylistDashboard";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex justify-between">
              <h1 className="text-xl font-bold">Salon Booking</h1>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<BookingForm />} />
            <Route path="/stylist/:id" element={<StylistDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
