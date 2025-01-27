import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import ServiceSelector from "./ServiceSelector";
import { format } from "date-fns";
import {
 STYLISTS,
 generateTimeSlots,
 updateStylistAvailability,
 parseTimeString,
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
 const findAvailableStylist = async (date, time, duration) => {
   // Convert requested time to minutes for comparison
   const requestTimeMinutes = parseTimeString(time);
   const requestEndMinutes = requestTimeMinutes + duration;
 
   console.log("Checking availability for:", { time, duration, requestTimeMinutes, requestEndMinutes });
 
   for (const stylist of STYLISTS) {
     const appointmentsRef = collection(db, "appointments");
     const q = query(
       appointmentsRef,
       where("stylistId", "==", stylist.id),
       where("date", "==", date)
     );
     
     const querySnapshot = await getDocs(q);
     const stylistAppointments = querySnapshot.docs.map(doc => doc.data());
     
     // Log existing appointments for debugging
     console.log("Existing appointments:", stylistAppointments);
 
     const hasConflict = stylistAppointments.some(appointment => {
       const appointmentStartMinutes = parseTimeString(appointment.time);
       const appointmentEndMinutes = appointmentStartMinutes + parseInt(appointment.duration);
       
       // Log each comparison for debugging
       console.log("Comparing with appointment:", {
         appointmentTime: appointment.time,
         appointmentDuration: appointment.duration,
         appointmentStartMinutes,
         appointmentEndMinutes
       });
 
       // Check for any overlap
       const overlap = (requestTimeMinutes < appointmentEndMinutes) && 
                      (requestEndMinutes > appointmentStartMinutes);
       
       console.log("Overlap result:", overlap);
       return overlap;
     });
 
     if (!hasConflict) {
       return stylist.id;
     }
   }
 
   // If we get here, no stylist is available
   return null;
 };

 // Generate time slots whenever date or service changes
 useEffect(() => {
   const loadTimeSlots = async () => {
     if (selectedDate && selectedService) {
       try {
         const slots = generateTimeSlots(selectedService.duration, selectedDate);
         
         // If stylist isn't selected, check each time slot for ANY available stylist
         if (!selectedStylist) {
           const availableSlots = [];
           
           // For each time slot, check ALL stylists
           for (const slot of slots) {
             // Get ALL appointments for ALL stylists for this date
             const appointmentsRef = collection(db, "appointments");
             const q = query(
               appointmentsRef,
               where("date", "==", selectedDate)
             );
             
             const querySnapshot = await getDocs(q);
             const allAppointments = querySnapshot.docs.map(doc => doc.data());
             
             const slotStartTime = parseTimeString(slot);
             const slotEndTime = slotStartTime + selectedService.duration;
             
             // Check if at least one stylist is available
             const isAnyStylistAvailable = STYLISTS.some(stylist => {
               // Filter appointments for this specific stylist
               const stylistAppointments = allAppointments.filter(
                 appt => appt.stylistId === stylist.id
               );
               
               // Check if this stylist has any conflicts
               const hasConflict = stylistAppointments.some(appointment => {
                 const appointmentStartTime = parseTimeString(appointment.time);
                 const appointmentEndTime = appointmentStartTime + parseInt(appointment.duration);
                 return (slotStartTime < appointmentEndTime) && 
                        (slotEndTime > appointmentStartTime);
               });
               
               return !hasConflict; // Return true if stylist is available
             });
             
             if (isAnyStylistAvailable) {
               availableSlots.push(slot);
             }
           }
           setAvailableTimeSlots(availableSlots);
         } else {
           // Existing code for when a specific stylist is selected
           const availableSlots = [];
           for (const slot of slots) {
             const appointmentsRef = collection(db, "appointments");
             const q = query(
               appointmentsRef,
               where("stylistId", "==", selectedStylist),
               where("date", "==", selectedDate)
             );
             
             const querySnapshot = await getDocs(q);
             const existingAppointments = querySnapshot.docs.map(doc => doc.data());
             
             const slotStartTime = parseTimeString(slot);
             const slotEndTime = slotStartTime + selectedService.duration;
             
             const hasConflict = existingAppointments.some(appointment => {
               const appointmentStartTime = parseTimeString(appointment.time);
               const appointmentEndTime = appointmentStartTime + parseInt(appointment.duration);
               return (slotEndTime > appointmentStartTime) && 
                      (slotStartTime < appointmentEndTime);
             });
             
             if (!hasConflict) {
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
       const availableStylistId = await findAvailableStylist(
         selectedDate, 
         selectedTime,
         selectedService?.duration
       );
       if (availableStylistId) {
         setSelectedStylist(availableStylistId);
       }
     }
   };

   assignStylist();
 }, [selectedTime, selectedDate, selectedService]);

 const formatPhoneNumber = (e) => {
  // Get only the numbers from the input value
  const numbersOnly = e.target.value.replace(/\D/g, "");
  
  // Limit to 10 digits
  const limitedNumbers = numbersOnly.slice(0, 10);
  
  // Format the number as xxx-xxx-xxxx
  const parts = [];
  if (limitedNumbers.length > 0) parts.push(limitedNumbers.slice(0, 3));
  if (limitedNumbers.length > 3) parts.push(limitedNumbers.slice(3, 6));
  if (limitedNumbers.length > 6) parts.push(limitedNumbers.slice(6, 10));

  setCustomerPhone(parts.join("-"));
};

 const handleSubmit = async (e) => {
   e.preventDefault();

   try {
     let finalStylistId = selectedStylist;
     if (!selectedStylist) {
       const availableStylistId = await findAvailableStylist(
         selectedDate, 
         selectedTime, 
         selectedService.duration
       );
       if (!availableStylistId) {
         alert("Sorry, this time slot is not available due to overlapping appointments. Please select a different time.");
         return;
       }
       finalStylistId = availableStylistId;
     } else {
       // Check if selected stylist is actually available
       const appointmentsRef = collection(db, "appointments");
       const q = query(
         appointmentsRef,
         where("stylistId", "==", selectedStylist),
         where("date", "==", selectedDate)
       );
       
       const querySnapshot = await getDocs(q);
       const existingAppointments = querySnapshot.docs.map(doc => doc.data());
       
       const requestTimeMinutes = parseTimeString(selectedTime);
       const requestEndMinutes = requestTimeMinutes + selectedService.duration;
       
       const hasConflict = existingAppointments.some(appointment => {
         const appointmentStartMinutes = parseTimeString(appointment.time);
         const appointmentEndMinutes = appointmentStartMinutes + parseInt(appointment.duration);
         return (requestTimeMinutes < appointmentEndMinutes) && 
                (requestEndMinutes > appointmentStartMinutes);
       });

       if (hasConflict) {
         alert("Sorry, this stylist is not available at this time due to an overlapping appointment. Please select a different time or stylist.");
         return;
       }
     }

     const appointment = {
       stylistId: finalStylistId,
       serviceId: selectedService.id,
       serviceName: selectedService.name,
       duration: selectedService.duration,
       date: selectedDate,
       time: selectedTime,
       customerName,
       customerPhone: customerPhone.replace(/-/g, ""),
       status: "scheduled",
       createdAt: new Date(),
     };

     const docRef = await addDoc(collection(db, "appointments"), appointment);

     if (docRef.id) {
       await updateStylistAvailability(
         finalStylistId,
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
         <div className="bg-purple-200 p-4 rounded">
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
           onChange={formatPhoneNumber}
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