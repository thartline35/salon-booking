import { format, parse, addMinutes, parseISO, isBefore } from "date-fns";
import { collection, getDocs, query, where } from "firebase/firestore";

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

export const STYLISTS = [
  { id: "jennifer", name: "Jennifer", phone: "2566132308" },
  { id: "heather", name: "Heather", phone: "2565577173" },
];

// Utility function to parse time in 12-hour format (AM/PM)
const parseTime = (timeStr) => {
  const [time, period] = timeStr.split(" ");
  const [hours, minutes] = time.split(":").map(Number);

  // Adjust the hour based on AM/PM
  if (period === "PM" && hours !== 12) {
    return (hours + 12) * 60 + minutes; // Convert PM times to 24-hour format
  }
  if (period === "AM" && hours === 12) {
    return minutes; // Midnight case: 12:00 AM is 00:00 in 24-hour format
  }
  return hours * 60 + minutes; // AM times and normal PM times (except 12 PM) are kept as is
};

// Generate time slots for a specific date and service duration
export const generateTimeSlots = (date, serviceDuration) => {
  const dayOfWeek = format(parseISO(date), "EEEE");
  const hours = BUSINESS_HOURS[dayOfWeek];

  if (!hours?.isOpen) return [];

  const slots = [];
  const startTime = parse(hours.start, "hh:mm a", parseISO(date));
  const endTime = parse(hours.end, "hh:mm a", parseISO(date));

  let currentTime = startTime;
  while (isBefore(currentTime, endTime)) {
    const slotEndTime = addMinutes(currentTime, serviceDuration);

    // Ensure the entire service duration fits within business hours
    if (isBefore(slotEndTime, endTime)) {
      slots.push(format(currentTime, "hh:mm a"));
    }

    // Move to next slot (15-minute increments)
    currentTime = addMinutes(currentTime, 15);
  }

  // Sort slots chronologically: AM first, then PM
  return slots.sort((a, b) => parseTime(a) - parseTime(b));
};

// Generate available times for a selected date and service
export const generateAvailableTimes = async (date, selectedService, db) => {
  const dayOfWeek = format(parseISO(date), "EEEE");
  const businessHours = BUSINESS_HOURS[dayOfWeek];

  if (!businessHours?.isOpen) {
    return {
      availableTimes: [],
      status: {
        isOpen: false,
        message: "Salon is closed on this day.",
      },
    };
  }

  try {
    // Fetch all appointments for the selected date
    const appointmentsSnapshot = await getDocs(
      query(collection(db, "appointments"), where("date", "==", date))
    );

    // Convert business hours to actual times
    const startTime = parse(businessHours.start, "h:mm a", new Date());
    const endTime = parse(businessHours.end, "h:mm a", new Date());

    // Get existing appointments
    const existingAppointments = appointmentsSnapshot.docs.map((doc) =>
      doc.data()
    );

    // Generate all possible time slots within business hours
    const allSlots = [];
    let currentTime = startTime;

    while (isBefore(currentTime, endTime)) {
      const timeSlot = format(currentTime, "h:mm a");

      // Check if this slot is available
      const isAvailable = !existingAppointments.some(
        (apt) =>
          apt.time === timeSlot && apt.duration >= selectedService.duration
      );

      if (isAvailable) {
        allSlots.push(timeSlot);
      }

      // Move to next slot (15-minute increments)
      currentTime = addMinutes(currentTime, 15);
    }

    // Sort slots chronologically (AM first, then PM)
    const sortedSlots = allSlots.sort((a, b) => parseTime(a) - parseTime(b));

    return {
      availableTimes: sortedSlots,
      status: {
        isOpen: true,
        message: `Open from ${businessHours.start} to ${businessHours.end}`,
        totalSlots: allSlots.length,
        availableSlots: sortedSlots.length,
      },
    };
  } catch (error) {
    console.error("Error generating available times:", error);
    return {
      availableTimes: [],
      status: {
        isOpen: false,
        message: "Error checking availability",
      },
    };
  }
};

// Add these at the end of the existing appointmentUtils.js file

/**
 * Find service category by service ID
 * @param {Object} SERVICES - Services object from services.js
 * @param {string} serviceId - ID of the service to find
 * @returns {string|null} Category name or null if not found
 */
export const findServiceCategory = (SERVICES, serviceId) => {
  for (const category of Object.keys(SERVICES)) {
    if (SERVICES[category].some((s) => s.id === serviceId)) {
      return category;
    }
  }
  return null;
};

/**
 * Find service details by ID across all service categories
 * @param {Object} SERVICES - Services object from services.js
 * @param {string} serviceId - ID of the service to find
 * @returns {Object|null} Service details or null if not found
 */
export const findServiceDetails = (SERVICES, serviceId) => {
  for (const category of Object.keys(SERVICES)) {
    const service = SERVICES[category].find((s) => s.id === serviceId);
    if (service) return service;
  }
  return null;
};
