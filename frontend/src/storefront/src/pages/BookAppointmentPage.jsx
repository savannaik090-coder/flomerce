import React, { useState } from 'react';
import { useSiteConfig } from '../hooks/useSiteConfig.js';
import { API_BASE } from '../config.js';
import PhoneInput from '../components/ui/PhoneInput.jsx';

const TIME_SLOTS = [
  '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM',
  '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM',
];

const PURPOSES = [
  { value: '', label: 'Select purpose' },
  { value: 'consultation', label: 'General Consultation' },
  { value: 'other', label: 'Other' },
];

export default function BookAppointmentPage() {
  const { siteConfig } = useSiteConfig();
  const [appointmentType, setAppointmentType] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '',
    appointmentDate: '', purpose: '', notes: '',
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function getMinDate() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }


  async function handleSubmit(e) {
    e.preventDefault();
    if (!appointmentType) { setStatus({ type: 'error', msg: 'Please select an appointment type.' }); return; }
    if (!selectedTime) { setStatus({ type: 'error', msg: 'Please select a time slot.' }); return; }
    setSubmitting(true);
    setStatus(null);
    try {
      const purposeLabel = PURPOSES.find(p => p.value === form.purpose)?.label || form.purpose;
      const response = await fetch(`${API_BASE}/api/email/appointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.fullName,
          email: form.email,
          phone: form.phone,
          date: form.appointmentDate,
          time: selectedTime,
          notes: `Type: ${appointmentType}\nPurpose: ${purposeLabel}${form.notes ? '\n' + form.notes : ''}`,
          siteEmail: siteConfig?.email,
          brandName: siteConfig?.brandName,
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus({ type: 'success', msg: 'Your appointment has been booked successfully! We\'ll send you a confirmation shortly.' });
        setForm({ fullName: '', email: '', phone: '', appointmentDate: '', purpose: '', notes: '' });
        setAppointmentType('');
        setSelectedTime('');
      } else {
        setStatus({ type: 'error', msg: result.error || 'Something went wrong. Please try again.' });
      }
    } catch {
      setStatus({ type: 'error', msg: 'Something went wrong. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="book-appointment-page">
      <style>{`
        .appointment-container {
          max-width: 800px; margin: 40px auto 50px; padding: 40px 20px;
        }
        .appointment-header { text-align: center; margin-bottom: 40px; }
        .appointment-header h1 {
          font-family: 'Playfair Display', serif; font-size: 2.5rem;
          color: #333; margin-bottom: 10px;
        }
        .appointment-header p { color: #666; font-size: 1.1rem; }
        .appointment-form {
          background: #fff; padding: 40px; border-radius: 10px;
          box-shadow: 0 2px 20px rgba(0,0,0,0.1);
        }
        .form-section { margin-bottom: 30px; }
        .form-section h3 {
          font-family: 'Playfair Display', serif; color: #333;
          margin-bottom: 20px; font-size: 1.3rem;
        }
        .appointment-type { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; }
        .type-option {
          border: 2px solid #e0e0e0; padding: 20px; border-radius: 8px;
          cursor: pointer; text-align: center; transition: all 0.3s ease;
        }
        .type-option:hover { border-color: #9c7c38; }
        .type-option.selected { border-color: #9c7c38; background-color: #f9f6f0; }
        .type-option i { font-size: 2rem; margin-bottom: 10px; color: #9c7c38; display: block; }
        .type-option strong { display: block; margin-bottom: 4px; }
        .type-option .type-desc { font-size: 0.9rem; color: #666; }
        .appt-form-group { margin-bottom: 20px; }
        .appt-form-group label {
          display: block; margin-bottom: 8px; color: #333; font-weight: 500;
        }
        .appt-form-group input, .appt-form-group select, .appt-form-group textarea {
          width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px;
          font-size: 1rem; font-family: 'Lato', sans-serif; box-sizing: border-box;
        }
        .appt-form-group textarea { resize: vertical; min-height: 100px; }
        .time-slots { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .time-slot {
          padding: 12px; border: 1px solid #ddd; border-radius: 6px;
          text-align: center; cursor: pointer; transition: all 0.3s ease;
          background: #fff; font-size: 14px;
        }
        .time-slot:hover { border-color: #9c7c38; background-color: #f9f6f0; }
        .time-slot.selected { background-color: #9c7c38; color: white; border-color: #9c7c38; }
        .appt-submit-btn {
          background-color: #333; color: white; padding: 15px 40px;
          border: none; border-radius: 6px; font-size: 1rem;
          font-weight: 500; cursor: pointer; width: 100%;
          margin-top: 20px; transition: background-color 0.3s ease;
        }
        .appt-submit-btn:hover { background-color: #000; }
        .appt-submit-btn:disabled { background-color: #ccc; cursor: not-allowed; }
        .appt-status-msg {
          padding: 15px; border-radius: 6px; margin-bottom: 20px;
          font-family: 'Poppins', sans-serif;
        }
        .appt-status-msg.success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .appt-status-msg.error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        @media (max-width: 768px) {
          .appointment-container { margin-top: 30px; }
          .appointment-type { grid-template-columns: 1fr; }
          .time-slots { grid-template-columns: repeat(2, 1fr); }
          .appointment-form { padding: 25px; }
        }
      `}</style>

      <div className="appointment-container">
        <div className="appointment-header">
          <h1>Book Your Appointment</h1>
          <p>Schedule a personalized consultation with our experts</p>
        </div>

        {status && (
          <div className={`appt-status-msg ${status.type}`}>
            <i className={`fas fa-${status.type === 'success' ? 'check' : 'exclamation'}-circle`}></i>{' '}
            {status.msg}
          </div>
        )}

        <form className="appointment-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Appointment Type</h3>
            <div className="appointment-type">
              <div
                className={`type-option ${appointmentType === 'in-store' ? 'selected' : ''}`}
                onClick={() => setAppointmentType('in-store')}
              >
                <i className="fas fa-store"></i>
                <strong>In-Store Visit</strong>
                <div className="type-desc">Visit our showroom</div>
              </div>
              <div
                className={`type-option ${appointmentType === 'virtual' ? 'selected' : ''}`}
                onClick={() => setAppointmentType('virtual')}
              >
                <i className="fas fa-video"></i>
                <strong>Virtual Consultation</strong>
                <div className="type-desc">Video call consultation</div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Personal Information</h3>
            <div className="appt-form-group">
              <label>Full Name *</label>
              <input type="text" name="fullName" value={form.fullName} onChange={handleChange} required />
            </div>
            <div className="appt-form-group">
              <label>Email Address *</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="appt-form-group">
              <label>Phone Number *</label>
              <PhoneInput value={form.phone} onChange={val => setForm(prev => ({ ...prev, phone: val }))} countryCode="IN" />
            </div>
          </div>

          <div className="form-section">
            <h3>Select Date & Time</h3>
            <div className="appt-form-group">
              <label>Preferred Date *</label>
              <input type="date" name="appointmentDate" value={form.appointmentDate} onChange={handleChange} min={getMinDate()} required />
            </div>
            <div className="appt-form-group">
              <label>Preferred Time Slot *</label>
              <div className="time-slots">
                {TIME_SLOTS.map((slot) => (
                  <div
                    key={slot}
                    className={`time-slot ${selectedTime === slot ? 'selected' : ''}`}
                    onClick={() => setSelectedTime(slot)}
                  >
                    {slot}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Additional Details</h3>
            <div className="appt-form-group">
              <label>Purpose of Visit</label>
              <select name="purpose" value={form.purpose} onChange={handleChange}>
                {PURPOSES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="appt-form-group">
              <label>Additional Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Any specific requirements or questions..." />
            </div>
          </div>

          <button type="submit" className="appt-submit-btn" disabled={submitting}>
            {submitting ? 'Booking...' : 'Book Appointment'}
          </button>
        </form>
      </div>
    </div>
  );
}
