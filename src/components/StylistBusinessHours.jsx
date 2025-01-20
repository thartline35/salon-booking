import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  query, 
  where 
} from 'firebase/firestore';
import { STYLISTS } from '../utils/appointmentUtils';

const DAYS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
  'Friday', 'Saturday', 'Sunday'
];

const StylistDashboard = () => {
  const [selectedStylist, setSelectedStylist] = useState('');
  const [businessHours, setBusinessHours] = useState({});
  const [newHour, setNewHour] = useState({
    day: 'Monday',
    isOpen: false,
    start: '',
    end: ''
  });

  const fetchBusinessHours = async () => {
    if (!selectedStylist) {
      setBusinessHours({});
      return;
    }

    try {
      const q = query(
        collection(db, 'businessHours'),
        where('stylistId', '==', selectedStylist)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const hoursData = snapshot.docs[0].data();
        setBusinessHours(hoursData);
      } else {
        // Initialize with default closed state if no hours found
        const defaultHours = DAYS.reduce((acc, day) => {
          acc[day] = { isOpen: false, start: '', end: '' };
          return acc;
        }, {});
        setBusinessHours(defaultHours);
      }
    } catch (error) {
      console.error('Error fetching business hours:', error);
    }
  };

  useEffect(() => {
    fetchBusinessHours();
  }, [selectedStylist]);

  const handleUpdateHours = async (day) => {
    if (!selectedStylist) {
      alert('Please select a stylist first');
      return;
    }

    try {
      const hoursRef = doc(collection(db, 'businessHours'));
      await setDoc(hoursRef, {
        ...businessHours,
        stylistId: selectedStylist,
        [day]: {
          isOpen: newHour.isOpen,
          start: newHour.start,
          end: newHour.end
        }
      });

      // Refresh hours after update
      fetchBusinessHours();
      
      // Reset form
      setNewHour({
        day: 'Monday',
        isOpen: false,
        start: '',
        end: ''
      });
    } catch (error) {
      console.error('Error updating business hours:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Business Hours Management</h2>
      
      {/* Stylist Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Stylist</label>
        <select
          value={selectedStylist}
          onChange={(e) => setSelectedStylist(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">Select a stylist</option>
          {STYLISTS.map(stylist => (
            <option key={stylist.id} value={stylist.id}>
              {stylist.name}
            </option>
          ))}
        </select>
      </div>

      {selectedStylist && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {DAYS.map(day => (
              <div key={day} className="border p-4 rounded">
                <h3 className="font-semibold">{day}</h3>
                {businessHours[day] ? (
                  <div>
                    {businessHours[day].isOpen ? (
                      <p>
                        Open: {businessHours[day].start} - {businessHours[day].end}
                      </p>
                    ) : (
                      <p>Closed</p>
                    )}
                  </div>
                ) : (
                  <p>Not set</p>
                )}
              </div>
            ))}
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateHours(newHour.day);
            }} 
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium mb-2">Day</label>
              <select
                value={newHour.day}
                onChange={(e) => setNewHour({...newHour, day: e.target.value})}
                className="w-full p-2 border rounded"
              >
                {DAYS.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newHour.isOpen}
                  onChange={(e) => setNewHour({...newHour, isOpen: e.target.checked})}
                  className="mr-2"
                />
                Open
              </label>
            </div>

            {newHour.isOpen && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Start Time</label>
                  <input
                    type="time"
                    value={newHour.start}
                    onChange={(e) => setNewHour({...newHour, start: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">End Time</label>
                  <input
                    type="time"
                    value={newHour.end}
                    onChange={(e) => setNewHour({...newHour, end: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              Update Hours
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default StylistDashboard;