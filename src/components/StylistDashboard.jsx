import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';

const BUSINESS_HOURS = {
  Monday: { isOpen: false },
  Tuesday: { isOpen: true, start: '10:00 AM', end: '5:00 PM' },
  Wednesday: { isOpen: true, start: '10:00 AM', end: '5:00 PM' },
  Thursday: { isOpen: true, start: '10:00 AM', end: '5:00 PM' },
  Friday: { isOpen: true, start: '10:00 AM', end: '5:00 PM' },
  Saturday: { isOpen: true, start: '9:00 AM', end: '4:30 PM' },
  Sunday: { isOpen: false }
};

const StylistDashboard = ({ stylistId }) => {
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [newBlock, setNewBlock] = useState({
    date: '',
    startTime: '',
    endTime: '',
    reason: ''
  });

  const fetchBlockedTimes = useCallback(async () => {
    try {
      const q = query(
        collection(db, 'blockedTimes'),
        where('stylistId', '==', stylistId)
      );
      const snapshot = await getDocs(q);
      const blocks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBlockedTimes(blocks);
    } catch (error) {
      console.error('Error fetching blocked times:', error);
    }
  }, [stylistId]);

  useEffect(() => {
    fetchBlockedTimes();
  }, [fetchBlockedTimes]);

  const handleBlockTime = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'blockedTimes'), {
        stylistId,
        ...newBlock,
        createdAt: new Date()
      });
      
      // Reset form and refresh list
      setNewBlock({
        date: '',
        startTime: '',
        endTime: '',
        reason: ''
      });
      fetchBlockedTimes();
      
      alert('Time blocked successfully');
    } catch (error) {
      console.error('Error blocking time:', error);
      alert('Error blocking time. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Regular Hours</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(BUSINESS_HOURS).map(([day, hours]) => (
            <div key={day} className="p-4 border rounded">
              <h3 className="font-semibold">{day}</h3>
              <p>{hours.isOpen ? `${hours.start} - ${hours.end}` : 'Closed'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Block Time Off</h2>
        <form onSubmit={handleBlockTime} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={newBlock.date}
              onChange={(e) => setNewBlock({...newBlock, date: e.target.value})}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input
                type="time"
                value={newBlock.startTime}
                onChange={(e) => setNewBlock({...newBlock, startTime: e.target.value})}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input
                type="time"
                value={newBlock.endTime}
                onChange={(e) => setNewBlock({...newBlock, endTime: e.target.value})}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Reason (optional)</label>
            <input
              type="text"
              value={newBlock.reason}
              onChange={(e) => setNewBlock({...newBlock, reason: e.target.value})}
              className="w-full p-2 border rounded"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Block Time
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Blocked Times</h2>
        <div className="space-y-2">
          {blockedTimes.map(block => (
            <div key={block.id} className="p-4 border rounded">
              <p className="font-semibold">
                {new Date(block.date).toLocaleDateString()} : {block.startTime} - {block.endTime}
              </p>
              {block.reason && <p className="text-gray-600">{block.reason}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StylistDashboard;