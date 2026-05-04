import React, { useState } from 'react';
import { Store, Video, Calendar, Clock, FileText, User, Mail, Phone, ChevronDown } from 'lucide-react';

const TIME_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
];

const PURPOSES = [
  { value: '', label: 'Select a purpose...' },
  { value: 'bridal', label: 'Bridal Consultation' },
  { value: 'styling', label: 'Personal Styling' },
  { value: 'gifting', label: 'Gifting Advisory' },
  { value: 'alteration', label: 'Alteration & Customization' },
  { value: 'other', label: 'Other' },
];

const GOLD = '#9c7c38';
const GOLD_LIGHT = '#f9f6f0';
const GOLD_DARK = '#7a6028';

export function PolishedGold() {
  const [appointmentType, setAppointmentType] = useState<'in-store' | 'virtual'>('in-store');
  const [selectedTime, setSelectedTime] = useState<string>('10:00 AM');
  const [purpose, setPurpose] = useState('');

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#faf8f5',
        fontFamily: "'Lato', 'Helvetica Neue', sans-serif",
        color: '#333',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Lato:wght@300;400;500;600;700&display=swap');

        .bap-input, .bap-select, .bap-textarea {
          width: 100%;
          padding: 11px 14px;
          border: 1.5px solid #ddd;
          border-radius: 7px;
          font-size: 0.97rem;
          font-family: 'Lato', sans-serif;
          background: #fff;
          color: #333;
          box-sizing: border-box;
          transition: border-color 0.2s, outline 0.2s, box-shadow 0.2s;
          outline: 2px solid transparent;
          outline-offset: 2px;
        }
        .bap-input:focus, .bap-select:focus, .bap-textarea:focus {
          border-color: ${GOLD};
          outline: 2px solid ${GOLD};
          outline-offset: 2px;
          box-shadow: 0 0 0 4px rgba(156,124,56,0.10);
        }
        .bap-textarea {
          resize: vertical;
          min-height: 100px;
        }
        .bap-select {
          appearance: none;
          -webkit-appearance: none;
          background-image: none;
          cursor: pointer;
        }

        .type-card {
          border: 2px solid #e5e0d8;
          padding: 22px 18px;
          border-radius: 10px;
          cursor: pointer;
          text-align: center;
          transition: all 0.25s ease;
          background: #fff;
          position: relative;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .type-card:hover {
          border-color: ${GOLD};
          box-shadow: 0 4px 16px rgba(156,124,56,0.12);
          transform: translateY(-1px);
        }
        .type-card.selected {
          border-color: ${GOLD};
          background: ${GOLD_LIGHT};
          box-shadow: 0 4px 20px rgba(156,124,56,0.18);
        }
        .type-card.selected::after {
          content: '';
          position: absolute;
          top: 10px;
          right: 10px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: ${GOLD};
        }

        .time-pill {
          padding: 9px 4px;
          border: 1.5px solid #e0dbd2;
          border-radius: 20px;
          text-align: center;
          cursor: pointer;
          font-size: 0.85rem;
          font-family: 'Lato', sans-serif;
          background: #fff;
          color: #555;
          transition: all 0.2s ease;
          font-weight: 500;
        }
        .time-pill:hover {
          border-color: ${GOLD};
          background: ${GOLD_LIGHT};
          color: ${GOLD_DARK};
          box-shadow: 0 2px 8px rgba(156,124,56,0.12);
        }
        .time-pill.selected {
          background: ${GOLD};
          color: #fff;
          border-color: ${GOLD};
          box-shadow: 0 2px 10px rgba(156,124,56,0.30);
          font-weight: 600;
        }

        .section-heading {
          font-family: 'Playfair Display', serif;
          color: #333;
          margin-bottom: 20px;
          font-size: 1.25rem;
          font-weight: 600;
          padding-left: 14px;
          border-left: 3px solid ${GOLD};
          line-height: 1.4;
        }

        .submit-btn {
          background: #1a1a1a;
          color: #fff;
          width: 100%;
          height: 52px;
          border: none;
          border-radius: 8px;
          font-size: 1.05rem;
          font-weight: 600;
          font-family: 'Lato', sans-serif;
          cursor: pointer;
          margin-top: 24px;
          letter-spacing: 0.03em;
          transition: background 0.3s ease, box-shadow 0.3s ease, transform 0.15s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .submit-btn:hover {
          background: ${GOLD};
          box-shadow: 0 4px 18px rgba(156,124,56,0.35);
          transform: translateY(-1px);
        }
      `}</style>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 64px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '2.6rem',
            fontWeight: 700,
            color: '#1a1a1a',
            margin: 0,
            lineHeight: 1.2,
          }}>
            Book Your Appointment
          </h1>
          {/* Decorative accent line */}
          <div style={{
            width: 64,
            height: 3,
            background: GOLD,
            borderRadius: 2,
            margin: '14px auto 16px',
          }} />
          <p style={{
            color: '#777',
            fontSize: '1.05rem',
            margin: 0,
            fontStyle: 'italic',
          }}>
            Schedule a personalized consultation with our experts
          </p>
        </div>

        {/* Form Card */}
        <div style={{
          background: '#fff',
          padding: '44px 44px 40px',
          borderRadius: 14,
          boxShadow: '0 4px 40px rgba(0,0,0,0.08), 0 1px 6px rgba(0,0,0,0.04)',
        }}>

          {/* Section 1: Appointment Type */}
          <div style={{ marginBottom: 36 }}>
            <h3 className="section-heading">Appointment Type</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
            }}>
              {/* In-Store */}
              <div
                className={`type-card${appointmentType === 'in-store' ? ' selected' : ''}`}
                onClick={() => setAppointmentType('in-store')}
              >
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: appointmentType === 'in-store' ? GOLD : '#f3ede3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                  transition: 'background 0.25s',
                }}>
                  <Store
                    size={24}
                    color={appointmentType === 'in-store' ? '#fff' : GOLD}
                    strokeWidth={1.75}
                  />
                </div>
                <strong style={{
                  display: 'block',
                  fontSize: '1rem',
                  color: '#1a1a1a',
                  marginBottom: 5,
                  fontFamily: "'Playfair Display', serif",
                }}>
                  In-Store Visit
                </strong>
                <div style={{ fontSize: '0.875rem', color: '#888' }}>
                  Visit our showroom
                </div>
              </div>

              {/* Virtual */}
              <div
                className={`type-card${appointmentType === 'virtual' ? ' selected' : ''}`}
                onClick={() => setAppointmentType('virtual')}
              >
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: appointmentType === 'virtual' ? GOLD : '#f3ede3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                  transition: 'background 0.25s',
                }}>
                  <Video
                    size={24}
                    color={appointmentType === 'virtual' ? '#fff' : GOLD}
                    strokeWidth={1.75}
                  />
                </div>
                <strong style={{
                  display: 'block',
                  fontSize: '1rem',
                  color: '#1a1a1a',
                  marginBottom: 5,
                  fontFamily: "'Playfair Display', serif",
                }}>
                  Virtual Consultation
                </strong>
                <div style={{ fontSize: '0.875rem', color: '#888' }}>
                  Video call consultation
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: '#f0ece6', marginBottom: 36 }} />

          {/* Section 2: Personal Information */}
          <div style={{ marginBottom: 36 }}>
            <h3 className="section-heading">Personal Information</h3>

            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                marginBottom: 8,
                color: '#444',
                fontWeight: 600,
                fontSize: '0.92rem',
              }}>
                <User size={14} color={GOLD} />
                Full Name <span style={{ color: GOLD }}>*</span>
              </label>
              <input
                className="bap-input"
                type="text"
                placeholder="e.g. Priya Sharma"
                defaultValue=""
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                marginBottom: 8,
                color: '#444',
                fontWeight: 600,
                fontSize: '0.92rem',
              }}>
                <Mail size={14} color={GOLD} />
                Email Address <span style={{ color: GOLD }}>*</span>
              </label>
              <input
                className="bap-input"
                type="email"
                placeholder="e.g. priya@example.com"
                defaultValue=""
              />
            </div>

            <div style={{ marginBottom: 0 }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                marginBottom: 8,
                color: '#444',
                fontWeight: 600,
                fontSize: '0.92rem',
              }}>
                <Phone size={14} color={GOLD} />
                Phone Number <span style={{ color: GOLD }}>*</span>
              </label>
              <input
                className="bap-input"
                type="tel"
                placeholder="e.g. +91 98765 43210"
                defaultValue=""
              />
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: '#f0ece6', marginBottom: 36 }} />

          {/* Section 3: Select Date & Time */}
          <div style={{ marginBottom: 36 }}>
            <h3 className="section-heading">Select Date &amp; Time</h3>

            <div style={{ marginBottom: 22 }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                marginBottom: 8,
                color: '#444',
                fontWeight: 600,
                fontSize: '0.92rem',
              }}>
                <Calendar size={14} color={GOLD} />
                Preferred Date <span style={{ color: GOLD }}>*</span>
              </label>
              <input
                className="bap-input"
                type="date"
                defaultValue="2026-05-15"
              />
            </div>

            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                marginBottom: 12,
                color: '#444',
                fontWeight: 600,
                fontSize: '0.92rem',
              }}>
                <Clock size={14} color={GOLD} />
                Preferred Time Slot <span style={{ color: GOLD }}>*</span>
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 9,
              }}>
                {TIME_SLOTS.map((slot) => (
                  <div
                    key={slot}
                    className={`time-pill${selectedTime === slot ? ' selected' : ''}`}
                    onClick={() => setSelectedTime(slot)}
                  >
                    {slot}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: '#f0ece6', marginBottom: 36 }} />

          {/* Section 4: Additional Details */}
          <div style={{ marginBottom: 8 }}>
            <h3 className="section-heading">Additional Details</h3>

            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                marginBottom: 8,
                color: '#444',
                fontWeight: 600,
                fontSize: '0.92rem',
              }}>
                <FileText size={14} color={GOLD} />
                Purpose of Visit
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  className="bap-select bap-input"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                >
                  {PURPOSES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  color="#999"
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: 8,
                color: '#444',
                fontWeight: 600,
                fontSize: '0.92rem',
              }}>
                Additional Notes
              </label>
              <textarea
                className="bap-textarea bap-input"
                placeholder="Any specific requirements or questions..."
                rows={4}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button className="submit-btn">
            Book Appointment
          </button>

          {/* Footer note */}
          <p style={{
            textAlign: 'center',
            color: '#aaa',
            fontSize: '0.82rem',
            marginTop: 16,
            marginBottom: 0,
          }}>
            Our team will confirm your appointment within 24 hours.
          </p>

        </div>
      </div>
    </div>
  );
}

export default PolishedGold;
