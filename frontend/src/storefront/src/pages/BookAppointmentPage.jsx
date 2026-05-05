import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSiteConfig } from '../hooks/useSiteConfig.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { API_BASE } from '../config.js';
import PhoneInput from '../components/ui/PhoneInput.jsx';
import { isPlanAtLeast } from '../utils/plan.js';
import TranslatedText from '../components/TranslatedText';
import { useShopperTranslation } from '../context/ShopperTranslationContext.jsx';
import {
  APPOINTMENT_CLASSIC_STYLE_DEFAULTS,
  APPOINTMENT_MODERN_STYLE_DEFAULTS,
} from '../defaults/index.js';

const TIME_SLOTS = [
  '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM',
  '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM',
];

const CLASSIC_TIME_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
];

function ClassicBookAppointment({
  overrides, settings, PURPOSES, appointmentType, setAppointmentType,
  selectedTime, setSelectedTime, status, submitting,
  form, setForm, handleChange, handleSubmit, getMinDate,
}) {
  const { translate: tx } = useShopperTranslation();

  // Effective values: per-page override > brand identity > hardcoded default
  const o = overrides || {};
  const GOLD       = o.accentColor   || settings.brandAccent      || '#9c7c38';
  const GOLD_LIGHT = '#f9f6f0';
  const pageBg     = o.pageBg        || settings.brandBg          || '#faf8f5';
  const hFont      = o.headingFont   || settings.brandHeadingFont || "'Playfair Display', Georgia, serif";
  const bFont      = o.bodyFont      || settings.brandBodyFont    || "'Lato', 'Helvetica Neue', sans-serif";
  const btnBg      = settings.brandPrimary || '#1a1a1a';

  return (
    <div className="bap-classic-page" style={{ minHeight: '100vh', background: pageBg, fontFamily: bFont, color: '#333' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Lato:wght@300;400;500;600;700&display=swap');

        .bap-input, .bap-select, .bap-textarea {
          width: 100%; padding: 11px 14px;
          border: 1.5px solid #ddd; border-radius: 7px;
          font-size: 0.97rem; font-family: ${bFont};
          background: #fff; color: #333; box-sizing: border-box;
          transition: border-color 0.2s, outline 0.2s, box-shadow 0.2s;
          outline: 2px solid transparent; outline-offset: 2px;
        }
        .bap-input:focus, .bap-select:focus, .bap-textarea:focus {
          border-color: ${GOLD}; outline: 2px solid ${GOLD}; outline-offset: 2px;
          box-shadow: 0 0 0 4px ${GOLD}1a;
        }
        .bap-textarea { resize: vertical; min-height: 100px; }
        .bap-select { appearance: none; -webkit-appearance: none; cursor: pointer; }

        .bap-type-card {
          border: 2px solid #e5e0d8; padding: 22px 18px; border-radius: 10px;
          cursor: pointer; text-align: center; transition: all 0.25s ease;
          background: #fff; position: relative; box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .bap-type-card:hover {
          border-color: ${GOLD}; box-shadow: 0 4px 16px ${GOLD}1e; transform: translateY(-1px);
        }
        .bap-type-card.selected {
          border-color: ${GOLD}; background: ${GOLD_LIGHT};
          box-shadow: 0 4px 20px ${GOLD}2e;
        }
        .bap-type-card.selected::after {
          content: ''; position: absolute; top: 10px; right: 10px;
          width: 10px; height: 10px; border-radius: 50%; background: ${GOLD};
        }

        .bap-time-pill {
          padding: 9px 4px; border: 1.5px solid #e0dbd2; border-radius: 20px;
          text-align: center; cursor: pointer; font-size: 0.85rem;
          font-family: ${bFont}; background: #fff; color: #555;
          transition: all 0.2s ease; font-weight: 500;
        }
        .bap-time-pill:hover {
          border-color: ${GOLD}; background: ${GOLD_LIGHT};
          color: ${GOLD}; box-shadow: 0 2px 8px ${GOLD}1e;
        }
        .bap-time-pill.selected {
          background: ${GOLD}; color: #fff; border-color: ${GOLD};
          box-shadow: 0 2px 10px ${GOLD}4d; font-weight: 600;
        }

        .bap-section-heading {
          font-family: ${hFont}; color: #333; margin-bottom: 20px;
          font-size: 1.25rem; font-weight: 600; padding-left: 14px;
          border-left: 3px solid ${GOLD}; line-height: 1.4;
        }

        .bap-submit-btn {
          background: ${btnBg}; color: #fff; width: 100%; height: 52px;
          border: none; border-radius: 8px; font-size: 1.05rem; font-weight: 600;
          font-family: ${bFont}; cursor: pointer; margin-top: 24px;
          letter-spacing: 0.03em; transition: background 0.3s ease, box-shadow 0.3s ease, transform 0.15s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .bap-submit-btn:hover { background: ${GOLD}; box-shadow: 0 4px 18px ${GOLD}59; transform: translateY(-1px); }
        .bap-submit-btn:disabled { background: #ccc; cursor: not-allowed; transform: none; box-shadow: none; }

        @media (max-width: 640px) {
          .bap-type-grid { grid-template-columns: 1fr !important; }
          .bap-time-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .bap-form-card { padding: 28px 20px !important; }
        }
      `}</style>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 64px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontFamily: hFont, fontSize: '2.5rem', fontWeight: 700, color: '#1a1a1a', margin: 0, lineHeight: 1.2 }}>
            <TranslatedText text="Book Your Appointment" />
          </h1>
          <div style={{ width: 64, height: 3, background: GOLD, borderRadius: 2, margin: '14px auto 16px' }} />
          <p style={{ color: '#777', fontSize: '1.05rem', margin: 0, fontStyle: 'italic' }}>
            <TranslatedText text="Schedule a personalized consultation with our experts" />
          </p>
        </div>

        {status && (
          <div style={{
            padding: '14px 18px', borderRadius: 8, marginBottom: 24,
            background: status.type === 'success' ? '#d4edda' : '#f8d7da',
            color: status.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${status.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
            fontFamily: bFont,
          }}>
            <i className={`fas fa-${status.type === 'success' ? 'check' : 'exclamation'}-circle`} style={{ marginRight: 8 }} />
            {status.msg}
          </div>
        )}

        {/* Form Card */}
        <form
          className="bap-form-card"
          onSubmit={handleSubmit}
          style={{ background: '#fff', padding: '44px 44px 40px', borderRadius: 14, boxShadow: '0 4px 40px rgba(0,0,0,0.08), 0 1px 6px rgba(0,0,0,0.04)' }}
        >

          {/* Appointment Type */}
          <div style={{ marginBottom: 36 }}>
            <h3 className="bap-section-heading"><TranslatedText text="Appointment Type" /></h3>
            <div className="bap-type-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className={`bap-type-card${appointmentType === 'in-store' ? ' selected' : ''}`} onClick={() => setAppointmentType('in-store')}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: appointmentType === 'in-store' ? GOLD : '#f3ede3',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px', transition: 'background 0.25s',
                }}>
                  <i className="fas fa-store" style={{ color: appointmentType === 'in-store' ? '#fff' : GOLD, fontSize: 20 }} />
                </div>
                <strong style={{ display: 'block', fontSize: '1rem', color: '#1a1a1a', marginBottom: 5, fontFamily: hFont }}>
                  <TranslatedText text="In-Store Visit" />
                </strong>
                <div style={{ fontSize: '0.875rem', color: '#888' }}><TranslatedText text="Visit our showroom" /></div>
              </div>
              <div className={`bap-type-card${appointmentType === 'virtual' ? ' selected' : ''}`} onClick={() => setAppointmentType('virtual')}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: appointmentType === 'virtual' ? GOLD : '#f3ede3',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px', transition: 'background 0.25s',
                }}>
                  <i className="fas fa-video" style={{ color: appointmentType === 'virtual' ? '#fff' : GOLD, fontSize: 20 }} />
                </div>
                <strong style={{ display: 'block', fontSize: '1rem', color: '#1a1a1a', marginBottom: 5, fontFamily: hFont }}>
                  <TranslatedText text="Virtual Consultation" />
                </strong>
                <div style={{ fontSize: '0.875rem', color: '#888' }}><TranslatedText text="Video call consultation" /></div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: '#f0ece6', marginBottom: 36 }} />

          {/* Personal Information */}
          <div style={{ marginBottom: 36 }}>
            <h3 className="bap-section-heading"><TranslatedText text="Personal Information" /></h3>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, color: '#444', fontWeight: 600, fontSize: '0.92rem' }}>
                <i className="fas fa-user" style={{ color: GOLD, fontSize: 13 }} />
                <TranslatedText text="Full Name" /> <span style={{ color: GOLD }}>*</span>
              </label>
              <input className="bap-input" type="text" name="fullName" value={form.fullName} onChange={handleChange} placeholder={tx("e.g. Priya Sharma")} required />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, color: '#444', fontWeight: 600, fontSize: '0.92rem' }}>
                <i className="fas fa-envelope" style={{ color: GOLD, fontSize: 13 }} />
                <TranslatedText text="Email Address" /> <span style={{ color: GOLD }}>*</span>
              </label>
              <input className="bap-input" type="email" name="email" value={form.email} onChange={handleChange} placeholder={tx("e.g. priya@example.com")} required />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, color: '#444', fontWeight: 600, fontSize: '0.92rem' }}>
                <i className="fas fa-phone" style={{ color: GOLD, fontSize: 13 }} />
                <TranslatedText text="Phone Number" /> <span style={{ color: GOLD }}>*</span>
              </label>
              <PhoneInput value={form.phone} onChange={val => setForm(prev => ({ ...prev, phone: val }))} countryCode="IN" />
            </div>
          </div>

          <div style={{ height: 1, background: '#f0ece6', marginBottom: 36 }} />

          {/* Date & Time */}
          <div style={{ marginBottom: 36 }}>
            <h3 className="bap-section-heading"><TranslatedText text="Select Date & Time" /></h3>
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, color: '#444', fontWeight: 600, fontSize: '0.92rem' }}>
                <i className="fas fa-calendar-alt" style={{ color: GOLD, fontSize: 13 }} />
                <TranslatedText text="Preferred Date" /> <span style={{ color: GOLD }}>*</span>
              </label>
              <input className="bap-input" type="date" name="appointmentDate" value={form.appointmentDate} onChange={handleChange} min={getMinDate()} required />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, color: '#444', fontWeight: 600, fontSize: '0.92rem' }}>
                <i className="fas fa-clock" style={{ color: GOLD, fontSize: 13 }} />
                <TranslatedText text="Preferred Time Slot" /> <span style={{ color: GOLD }}>*</span>
              </label>
              <div className="bap-time-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 9 }}>
                {CLASSIC_TIME_SLOTS.map(slot => (
                  <div
                    key={slot}
                    className={`bap-time-pill${selectedTime === slot ? ' selected' : ''}`}
                    onClick={() => setSelectedTime(slot)}
                  >
                    {slot}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: '#f0ece6', marginBottom: 36 }} />

          {/* Additional Details */}
          <div style={{ marginBottom: 8 }}>
            <h3 className="bap-section-heading"><TranslatedText text="Additional Details" /></h3>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, color: '#444', fontWeight: 600, fontSize: '0.92rem' }}>
                <i className="fas fa-file-alt" style={{ color: GOLD, fontSize: 13 }} />
                <TranslatedText text="Purpose of Visit" />
              </label>
              <div style={{ position: 'relative' }}>
                <select className="bap-select bap-input" name="purpose" value={form.purpose} onChange={handleChange}>
                  {PURPOSES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <i className="fas fa-chevron-down" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#999', pointerEvents: 'none', fontSize: 13 }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, color: '#444', fontWeight: 600, fontSize: '0.92rem' }}>
                <TranslatedText text="Additional Notes" />
              </label>
              <textarea className="bap-textarea bap-input" name="notes" value={form.notes} onChange={handleChange} placeholder={tx("Any specific requirements or questions...")} rows={4} />
            </div>
          </div>

          <button type="submit" className="bap-submit-btn" disabled={submitting}>
            {submitting ? <TranslatedText text="Booking..." /> : <TranslatedText text="Book Appointment" />}
          </button>

          <p style={{ textAlign: 'center', color: '#aaa', fontSize: '0.82rem', marginTop: 16, marginBottom: 0 }}>
            <TranslatedText text="Our team will confirm your appointment within 24 hours." />
          </p>
        </form>
      </div>
    </div>
  );
}

// Build inline CSS vars from the merchant's saved overrides for the Modern
// Book Appointment page. Only fields that were explicitly set by the merchant
// emit a var — when a field is unset, the var is omitted so the fallback
// baked into modern.css (matching the Modern baseline) takes over.
function buildModernStyleVars(overrides) {
  const map = {
    pageBg: '--appointment-page-bg',
    headingFont: '--appointment-heading-font',
    headingColor: '--appointment-heading-color',
    bodyFont: '--appointment-body-font',
    bodyColor: '--appointment-body-color',
    accentColor: '--appointment-accent-color',
  };
  const out = {};
  if (!overrides || typeof overrides !== 'object') return out;
  for (const [key, cssVar] of Object.entries(map)) {
    const v = overrides[key];
    if (v && typeof v === 'string' && v !== '') out[cssVar] = v;
  }
  return out;
}

function ModernBookAppointment({
  overrides, PURPOSES, appointmentType, setAppointmentType,
  selectedTime, setSelectedTime, status, submitting,
  form, setForm, handleChange, handleSubmit, getMinDate,
}) {
  const { translate: tx } = useShopperTranslation();
  const styleVars = buildModernStyleVars(overrides);
  return (
    <div className="mn-appointment-page" style={styleVars}>
      <section className="mn-appointment-hero">
        <h1><TranslatedText text="Book Your Appointment" /></h1>
        <p><TranslatedText text="Schedule a personalized consultation with our experts" /></p>
      </section>

      <section className="mn-appointment-section">
        <div className="mn-appointment-container">
          {status && (
            <div className={`mn-appointment-status ${status.type}`}>
              <i className={`fas fa-${status.type === 'success' ? 'check' : 'exclamation'}-circle`}></i>{' '}
              {status.msg}
            </div>
          )}

          <form className="mn-appointment-form" onSubmit={handleSubmit}>
            <div className="mn-appt-section">
              <h3><TranslatedText text="Appointment Type" /></h3>
              <div className="mn-appt-type-grid">
                <div
                  className={`mn-appt-type ${appointmentType === 'in-store' ? 'selected' : ''}`}
                  onClick={() => setAppointmentType('in-store')}
                >
                  <i className="fas fa-store"></i>
                  <strong><TranslatedText text="In-Store Visit" /></strong>
                  <div className="mn-appt-type-desc"><TranslatedText text="Visit our showroom" /></div>
                </div>
                <div
                  className={`mn-appt-type ${appointmentType === 'virtual' ? 'selected' : ''}`}
                  onClick={() => setAppointmentType('virtual')}
                >
                  <i className="fas fa-video"></i>
                  <strong><TranslatedText text="Virtual Consultation" /></strong>
                  <div className="mn-appt-type-desc"><TranslatedText text="Video call consultation" /></div>
                </div>
              </div>
            </div>

            <div className="mn-appt-section">
              <h3><TranslatedText text="Personal Information" /></h3>
              <div className="mn-appt-group">
                <label><TranslatedText text="Full Name *" /></label>
                <input type="text" name="fullName" value={form.fullName} onChange={handleChange} required />
              </div>
              <div className="mn-appt-group">
                <label><TranslatedText text="Email Address *" /></label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required />
              </div>
              <div className="mn-appt-group">
                <label><TranslatedText text="Phone Number *" /></label>
                <PhoneInput value={form.phone} onChange={val => setForm(prev => ({ ...prev, phone: val }))} countryCode="IN" />
              </div>
            </div>

            <div className="mn-appt-section">
              <h3><TranslatedText text="Select Date & Time" /></h3>
              <div className="mn-appt-group">
                <label><TranslatedText text="Preferred Date *" /></label>
                <input type="date" name="appointmentDate" value={form.appointmentDate} onChange={handleChange} min={getMinDate()} required />
              </div>
              <div className="mn-appt-group">
                <label><TranslatedText text="Preferred Time Slot *" /></label>
                <div className="mn-appt-slots">
                  {TIME_SLOTS.map((slot) => (
                    <div
                      key={slot}
                      className={`mn-appt-slot ${selectedTime === slot ? 'selected' : ''}`}
                      onClick={() => setSelectedTime(slot)}
                    >
                      {slot}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mn-appt-section">
              <h3><TranslatedText text="Additional Details" /></h3>
              <div className="mn-appt-group">
                <label><TranslatedText text="Purpose of Visit" /></label>
                <select name="purpose" value={form.purpose} onChange={handleChange}>
                  {PURPOSES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="mn-appt-group">
                <label><TranslatedText text="Additional Notes" /></label>
                <textarea name="notes" value={form.notes} onChange={handleChange} placeholder={tx("Any specific requirements or questions...")} />
              </div>
            </div>

            <button type="submit" className="mn-appt-submit" disabled={submitting}>
              {submitting ? <TranslatedText text="Booking..." /> : <TranslatedText text="Book Appointment" />}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default function BookAppointmentPage() {
  const { translate: tx } = useShopperTranslation();
  const PURPOSES = [
    { value: '', label: tx("Select a purpose...") },
    { value: 'bridal', label: tx("Bridal Consultation") },
    { value: 'styling', label: tx("Personal Styling") },
    { value: 'gifting', label: tx("Gifting Advisory") },
    { value: 'alteration', label: tx("Alteration & Customization") },
    { value: 'consultation', label: tx("General Consultation") },
    { value: 'other', label: tx("Other") },
  ];
  const { siteConfig } = useSiteConfig();
  const { isModern } = useTheme();
  const [appointmentType, setAppointmentType] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '',
    appointmentDate: '', purpose: '', notes: '',
  });

  const appointmentBookingAllowed = isPlanAtLeast(siteConfig?.subscriptionPlan, 'growth');
  if (siteConfig && !appointmentBookingAllowed) {
    return <Navigate to="/" replace />;
  }

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
    if (!appointmentType) { setStatus({ type: 'error', msg: tx("Please select an appointment type.") }); return; }
    if (!selectedTime) { setStatus({ type: 'error', msg: tx("Please select a time slot.") }); return; }
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
          siteId: siteConfig?.id,
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus({ type: 'success', msg: tx("Your appointment has been booked successfully! We'll send you a confirmation shortly.") });
        setForm({ fullName: '', email: '', phone: '', appointmentDate: '', purpose: '', notes: '' });
        setAppointmentType('');
        setSelectedTime('');
      } else {
        setStatus({ type: 'error', msg: result.error || tx("Something went wrong. Please try again.") });
      }
    } catch {
      setStatus({ type: 'error', msg: tx("Something went wrong. Please try again.") });
    } finally {
      setSubmitting(false);
    }
  }

  let settings = siteConfig?.settings || {};
  if (typeof settings === 'string') {
    try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
  }
  const appointmentPage = settings.appointmentPage || {};
  const overrides = isModern ? appointmentPage.modernStyle : appointmentPage.classicStyle;

  const pageProps = {
    overrides, settings, PURPOSES, appointmentType, setAppointmentType,
    selectedTime, setSelectedTime, status, submitting,
    form, setForm, handleChange, handleSubmit, getMinDate,
  };

  return isModern
    ? <ModernBookAppointment {...pageProps} />
    : <ClassicBookAppointment {...pageProps} />;
}

// Re-exported so other modules / tests can import the defaults if needed.
export { APPOINTMENT_CLASSIC_STYLE_DEFAULTS, APPOINTMENT_MODERN_STYLE_DEFAULTS };
