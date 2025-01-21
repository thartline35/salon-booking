import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import ServiceSelector from "./ServiceSelector";
import { format } from "date-fns";
import {
  STYLISTS,
  generateTimeSlots,
  updateStylistAvailability,
} from "../utils/appointmentUtils";

const BookingForm = () => {
  const [selectedStylist, setSelectedStylist] = useState("");
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);

  // Handle service selection
  const handleServiceSelect = (service) => {
    setSelectedService(service);
    // Reset time if service changes
    setSelectedTime("");
  };

  // Auto-assign stylist based on availability
  const findAvailableStylist = async (date, time) => {
    for (const stylist of STYLISTS) {
      const appointmentsRef = collection(db, "appointments");
      const q = query(
        appointmentsRef,
        where("stylistId", "==", stylist.id),
        where("date", "==", date),
        where("time", "==", time)
      );
      
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return stylist.id;
      }
    }
    return null;
  };

  // Generate time slots whenever date or service changes
  useEffect(() => {
    const loadTimeSlots = async () => {
      if (selectedDate && selectedService) {
        try {
          const slots = generateTimeSlots(selectedService.duration, selectedDate);
          setAvailableTimeSlots(slots);
          
          // If stylist isn't selected, check each time slot for availability
          if (!selectedStylist) {
            const availableSlots = [];
            for (const slot of slots) {
              const hasAvailableStylist = await findAvailableStylist(selectedDate, slot);
              if (hasAvailableStylist) {
                availableSlots.push(slot);
              }
            }
            setAvailableTimeSlots(availableSlots);
          }
        } catch (error) {
          console.error("Error loading time slots:", error);
          setAvailableTimeSlots([]);
        }
      }
    };

    loadTimeSlots();
  }, [selectedDate, selectedService, selectedStylist]);

  // Auto-assign stylist when time is selected
  useEffect(() => {
    const assignStylist = async () => {
      if (selectedTime && !selectedStylist) {
        const availableStylistId = await findAvailableStylist(selectedDate, selectedTime);
        if (availableStylistId) {
          setSelectedStylist(availableStylistId);
        }
      }
    };

    assignStylist();
  }, [selectedTime, selectedDate]);

  const validatePhoneNumber = (phone) => {
    const numbersOnly = phone.replace(/\D/g, "");
    return numbersOnly.length === 10;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validatePhoneNumber(customerPhone)) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }

    try {
      const appointment = {
        stylistId: selectedStylist,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        duration: selectedService.duration,
        date: selectedDate,
        time: selectedTime,
        customerName,
        customerPhone: customerPhone.replace(/\D/g, ""),
        status: "scheduled",
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, "appointments"), appointment);

      if (docRef.id) {
        await updateStylistAvailability(
          selectedStylist,
          selectedDate,
          selectedTime,
          db
        );
        alert("Appointment booked successfully!");

        // Reset form
        setSelectedStylist("");
        setSelectedService(null);
        setSelectedDate("");
        setSelectedTime("");
        setCustomerName("");
        setCustomerPhone("");
      }
    } catch (error) {
      console.error("Error booking appointment:", error);
      alert("Error booking appointment. Please try again.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Book an Appointment</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Stylist Selection (Optional) */}
        <div>
          <label className="block text-sm font-medium mb-2">Choose Stylist (Optional)</label>
          <select
            value={selectedStylist}
            onChange={(e) => setSelectedStylist(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Any Available Stylist</option>
            {STYLISTS.map((stylist) => (
              <option key={stylist.id} value={stylist.id}>
                {stylist.name}
              </option>
            ))}
          </select>
        </div>

        {/* Service Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Choose Service</label>
          <ServiceSelector onServiceSelect={handleServiceSelect} />
        </div>

        {/* Display Selected Service Details */}
        {selectedService && (
          <div className="bg-gray-50 p-4 rounded">
            <p className="font-medium">Selected: {selectedService.name}</p>
            <p>Duration: {selectedService.duration} minutes</p>
            <p>Price: ${selectedService.price}{selectedService.variablePricing ? '+' : ''}</p>
            {selectedService.note && (
              <p className="text-sm text-gray-600">{selectedService.note}</p>
            )}
          </div>
        )}

        {/* Date Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Choose Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={format(new Date(), "yyyy-MM-dd")}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        {/* Time Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Choose Time</label>
          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Select a time</option>
            {availableTimeSlots.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>

        {/* Customer Information */}
        <div>
          <label className="block text-sm font-medium mb-2">Your Name</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Your Phone Number</label>
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
            placeholder="123-456-7890"
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          disabled={!selectedService || !selectedTime}
        >
          Book Appointment
        </button>
      </form>
    </div>
  );
};

export default BookingForm;