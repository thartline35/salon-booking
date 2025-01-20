import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import ServiceSelector from './ServiceSelector';
import { format } from 'date-fns';
import { SERVICES } from '../data/services';
import { 
  STYLISTS,
  generateTimeSlots,
  generateAvailableTimes, 
  findServiceCategory,
  findServiceDetails,
  checkDayAvailability
} from '../utils/appointmentUtils';

// Phone Input Component
const PhoneInput = ({ value, onChange }) => {
  const formatPhoneNumber = (input) => {
    const numbers = input.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };

  const handleChange = (e) => {
    const formattedNumber = formatPhoneNumber(e.target.value);
    onChange(formattedNumber);
  };

  const handleKeyDown = (e) => {
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'Escape' ||
      e.key === 'Enter' ||
      /^[0-9]$/.test(e.key)
    ) {
      return;
    }
    e.preventDefault();
  };

  return (
    <input
      type="tel"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className="w-full p-2 border rounded"
      placeholder="123-456-7890"
      maxLength="12"
      required
    />
  );
};

const BookingForm = () => {
  const [selectedStylist, setSelectedStylist] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState(null);

  useEffect(() => {
    const checkAvailability = async () => {
      if (!selectedDate || !selectedService) {
        setAvailabilityStatus(null);
        return;
      }
  
      try {
        const availability = await generateAvailableTimes(selectedDate, selectedService, db);
        console.log('Generated Availability:', availability);
        setAvailabilityStatus(availability);
      } catch (error) {
        console.error('Error checking availability:', error);
        setAvailabilityStatus(null);
      }
    };
  
    checkAvailability();
  }, [selectedDate, selectedService]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const numbersOnly = customerPhone.replace(/\D/g, '');
    if (numbersOnly.length !== 10) {
      alert('Please enter a valid 10-digit phone number');
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
        customerPhone: numbersOnly,
        status: 'scheduled',
        createdAt: new Date()
      };

      await addDoc(collection(db, 'appointments'), appointment);
      alert('Appointment booked successfully!');
      
      // Reset form
      setSelectedStylist('');
      setSelectedService(null);
      setSelectedDate('');
      setSelectedTime('');
      setCustomerName('');
      setCustomerPhone('');
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('Error booking appointment. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Book an Appointment</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Stylist Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Choose Stylist</label>
          <select
            value={selectedStylist}
            onChange={(e) => setSelectedStylist(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Select a stylist (optional)</option>
            {STYLISTS.map(stylist => (
              <option key={stylist.id} value={stylist.id}>
                {stylist.name}
              </option>
            ))}
          </select>
        </div>

        {/* Service Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Choose Service</label>
          <ServiceSelector onServiceSelect={setSelectedService} />
        </div>

        {selectedService && (
          <div className="bg-gray-50 p-4 rounded">
            <p className="font-medium">Selected: {selectedService.name}</p>
            <p>Category: {findServiceCategory(SERVICES, selectedService.id)}</p>
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
            onChange={(e) => {
              const date = e.target.value;
              setSelectedDate(date);
              setSelectedTime(''); // Reset time when date changes
            }}
            min={format(new Date(), 'yyyy-MM-dd')}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        {/* Availability Information */}
        {selectedDate && selectedService && availabilityStatus && (
          <div className={`p-4 rounded ${
            availabilityStatus.status.isOpen 
              ? 'bg-green-50 text-green-800' 
              : 'bg-red-50 text-red-800'
          }`}>
            {!availabilityStatus.status.isOpen ? (
              <p>{availabilityStatus.status.message}</p>
            ) : (
              <>
                <p>{availabilityStatus.status.message}</p>
                <p>
                  Available Slots: {availabilityStatus.status.availableSlots} 
                  / {availabilityStatus.status.totalSlots}
                </p>
              </>
            )}
          </div>
        )}

        {/* Time Selection */}
        {selectedDate && selectedService && availabilityStatus?.status.isOpen && (
          <div>
            <label className="block text-sm font-medium mb-2">Choose Time</label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select a time</option>
              {availabilityStatus.availableTimes.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
            {availabilityStatus.availableTimes.length === 0 && (
              <p className="text-red-500 text-sm mt-1">
                No available time slots for this date
              </p>
            )}
          </div>
        )}

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
          <PhoneInput
            value={customerPhone}
            onChange={setCustomerPhone}
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