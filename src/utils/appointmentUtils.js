import { format, parse, addMinutes, parseISO, isBefore } from "date-fns";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";

// Standard Business Hours (Salon-wide)
export const BUSINESS_HOURS = {
  Monday: { isOpen: false },
  Tuesday: { isOpen: true, start: "9:00 AM", end: "5:00 PM" },
  Wednesday: { isOpen: true, start: "9:00 AM", end: "5:00 PM" },
  Thursday: { isOpen: true, start: "9:00 AM", end: "5:00 PM" },
  Friday: { isOpen: true, start: "9:00 AM", end: "5:00 PM" },
  Saturday: { isOpen: true, start: "9:00 AM", end: "5:00 PM" },
  Sunday: { isOpen: false },
};

export const parseTimeString = (timeStr) => {
  const [time, period] = timeStr.split(" ");
  const [hours, minutes] = time.split(":").map(Number);
  let totalMinutes = hours * 60 + minutes;

  if (period === "PM" && hours !== 12) {
    totalMinutes += 12 * 60;
  } else if (period === "AM" && hours === 12) {
    totalMinutes = minutes;
  }

  return totalMinutes;
};

export const STYLISTS = [
  { id: "jennifer", name: "Jennifer", phone: "2566132308" },
  { id: "heather", name: "Heather", phone: "2565577173" },
];

// Get all available time slots for a given date and service
export const generateAvailableTimes = async (date, service, db) => {
  try {
    // Get already booked appointments
    const appointmentQuery = query(
      collection(db, "appointments"),
      where("date", "==", date),
      where("serviceId", "==", service.id)
    );
    const querySnapshot = await getDocs(appointmentQuery);
    const appointments = querySnapshot.docs.map((doc) => doc.data());

    // Generate all possible time slots
    const availableSlots = generateTimeSlots(service.duration, date);

    // Remove booked slots
    const finalSlots = availableSlots.filter((slot) => {
      return !appointments.some((appointment) => appointment.time === slot);
    });

    return {
      status: {
        isOpen: true,
        availableSlots: finalSlots.length,
        totalSlots: availableSlots.length,
      },
      availableTimes: finalSlots,
    };
  } catch (error) {
    console.error("Error generating available times:", error);
    return {
      status: { isOpen: false, message: "Unable to check availability" },
    };
  }
};

// Function to check if a specific day has availability
export const checkDayAvailability = (date) => {
  const dayOfWeek = new Date(date).toLocaleString("en-US", { weekday: "long" });
  return BUSINESS_HOURS[dayOfWeek]?.isOpen || false;
};

// Function to get all appointments for a specific stylist
export const getStylistAppointments = async (db, stylistId, date) => {
  try {
    const appointmentQuery = query(
      collection(db, "appointments"),
      where("stylistId", "==", stylistId),
      where("date", "==", date)
    );
    const querySnapshot = await getDocs(appointmentQuery);
    return querySnapshot.docs.map((doc) => doc.data());
  } catch (error) {
    console.error("Error fetching stylist appointments:", error);
    return [];
  }
};

// Function to generate time slots
export const generateTimeSlots = (duration, date) => {
  // Debug logging
  console.log("Generating time slots for:", { date, duration });

  // Create Date object with timezone handling
  const [year, month, day] = date.split("-").map(Number);
  const selectedDate = new Date(year, month - 1, day); // month is 0-based in JavaScript
  console.log("Selected date object:", selectedDate);

  // Add this right after creating selectedDate
  console.log("Date verification:", {
    originalDate: date,
    parsedDate: selectedDate,
    year,
    month,
    day,
    dayOfWeek: selectedDate.toLocaleString("en-US", { weekday: "long" }),
    isValid: selectedDate instanceof Date && !isNaN(selectedDate),
  });

  const dayOfWeek = selectedDate.toLocaleString("en-US", { weekday: "long" });
  console.log("Day of week:", dayOfWeek);

  // Get business hours for the day
  const hours = BUSINESS_HOURS[dayOfWeek];
  console.log("Business hours:", hours);

  if (!hours?.isOpen) {
    console.log(`Closed on ${dayOfWeek}`);
    return [];
  }

  const slots = [];

  // Parse the start and end times
  function parseTimeString(timeStr) {
    const [time, period] = timeStr.split(" ");
    const [hours, minutes] = time.split(":").map(Number);
    let totalMinutes = hours * 60 + minutes;

    if (period === "PM" && hours !== 12) {
      totalMinutes += 12 * 60;
    } else if (period === "AM" && hours === 12) {
      totalMinutes = minutes;
    }

    return totalMinutes;
  }

  const startMinutes = parseTimeString(hours.start);
  const endMinutes = parseTimeString(hours.end);

  console.log("Time range:", {
    start: hours.start,
    end: hours.end,
    startMinutes,
    endMinutes,
  });

  // Generate slots in 15-minute increments
  for (let time = startMinutes; time <= endMinutes - duration; time += 15) {
    const hour = Math.floor(time / 60);
    const minute = time % 60;

    // Format time in 12-hour format
    let displayHour = hour;
    const period = hour >= 12 ? "PM" : "AM";

    if (hour > 12) {
      displayHour -= 12;
    } else if (hour === 0) {
      displayHour = 12;
    }

    const timeSlot = `${displayHour}:${minute
      .toString()
      .padStart(2, "0")} ${period}`;
    slots.push(timeSlot);
  }

  console.log("Generated slots:", slots);
  return slots;
};

// Function to update stylist availability
export const updateStylistAvailability = async (stylistId, date, time, db) => {
  try {
    const stylistRef = doc(db, "stylists", stylistId);
    const stylistDoc = await getDoc(stylistRef);

    if (stylistDoc.exists()) {
      const availability = stylistDoc.data().availability || {};
      await updateDoc(stylistRef, {
        availability: {
          ...availability,
          [date]: {
            ...availability[date],
            blockedTimes: [...(availability[date]?.blockedTimes || []), time],
          },
        },
      });
    }
  } catch (error) {
    console.error("Error updating stylist availability:", error);
    throw error;
  }
};

export default {
  BUSINESS_HOURS,
  STYLISTS,
  generateAvailableTimes,
  checkDayAvailability,
  getStylistAppointments,
  generateTimeSlots,
  updateStylistAvailability,
};
