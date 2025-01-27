import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import BookingForm from "./components/BookingForm";
import StylistDashboard from "./components/StylistDashboard";
import logo from "./logo.png";

function App() {
  return (
    <Router>
      <div className="bg-teal-200">
        <header className="bg-pink-100">
          <img
            src={logo}
            alt="Salon Logo"
            className="mx-auto rounded-xl h-48 w-2/3"
          />
        </header>

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
