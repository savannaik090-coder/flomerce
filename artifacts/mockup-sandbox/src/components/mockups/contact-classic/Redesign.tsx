import React, { useState } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Send,
  ChevronRight,
} from 'lucide-react';

const DEEP_BROWN = '#5E2900';
const GOLD = '#d4af37';
const GOLD_DARK = '#b8941f';
const CREAM = '#f9f5f0';
const PARCHMENT = '#ede5d8';
const TEXT_DARK = '#2a1500';
const TEXT_MID = '#6b4c2a';
const TEXT_LIGHT = '#9a7a5a';
const WHITE = '#ffffff';

const fontImport = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Poppins:wght@300;400;500;600&display=swap');
`;

export function Redesign() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [activeField, setActiveField] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const contactDetails = [
    {
      icon: <MapPin size={18} strokeWidth={1.5} />,
      label: 'Visit Us',
      value: '42, Craft Lane, Koramangala, Bangalore — 560034',
      href: undefined,
    },
    {
      icon: <Phone size={18} strokeWidth={1.5} />,
      label: 'Call Us',
      value: '+91 98765 43210',
      href: 'tel:+919876543210',
    },
    {
      icon: <Mail size={18} strokeWidth={1.5} />,
      label: 'Write to Us',
      value: 'hello@hariniatelier.com',
      href: 'mailto:hello@hariniatelier.com',
    },
    {
      icon: <MessageCircle size={18} strokeWidth={1.5} />,
      label: 'WhatsApp',
      value: '+91 98765 43210',
      href: 'https://wa.me/919876543210',
    },
  ];

  const socialLinks = [
    { icon: <Instagram size={16} strokeWidth={1.5} />, label: 'Instagram', href: '#' },
    { icon: <Facebook size={16} strokeWidth={1.5} />, label: 'Facebook', href: '#' },
    { icon: <Twitter size={16} strokeWidth={1.5} />, label: 'Twitter', href: '#' },
    { icon: <Youtube size={16} strokeWidth={1.5} />, label: 'YouTube', href: '#' },
  ];

  const subjects = [
    'Product Inquiry',
    'Order Support',
    'Customisation Request',
    'Wholesale & Bulk Orders',
    'Media & Press',
    'Other',
  ];

  const hoursData = [
    { days: 'Monday – Friday', time: '10:00 AM – 7:00 PM' },
    { days: 'Saturday', time: '10:00 AM – 7:00 PM' },
    { days: 'Sunday', time: '11:00 AM – 6:00 PM' },
  ];

  return (
    <div
      style={{
        fontFamily: "'Poppins', sans-serif",
        background: CREAM,
        minHeight: '2400px',
        color: TEXT_DARK,
        width: '1280px',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: fontImport }} />

      {/* ── HERO: Split-screen ── */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          minHeight: '460px',
        }}
      >
        {/* Left — editorial image panel */}
        <div
          style={{
            background: `linear-gradient(160deg, ${DEEP_BROWN} 0%, #3a1800 100%)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 60px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* subtle dot texture */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='1.5' fill='%23d4af37' fill-opacity='0.08'/%3E%3C/svg%3E\")",
              opacity: 1,
            }}
          />
          {/* gold rule accent */}
          <div
            style={{
              width: 56,
              height: 3,
              background: `linear-gradient(90deg, ${GOLD}, ${GOLD_DARK})`,
              marginBottom: 28,
              borderRadius: 2,
            }}
          />
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 52,
              fontWeight: 700,
              color: CREAM,
              lineHeight: 1.15,
              textAlign: 'center',
              margin: '0 0 20px',
              position: 'relative',
            }}
          >
            We'd Love<br />
            <em style={{ color: GOLD, fontStyle: 'italic' }}>to Hear</em><br />
            from You
          </h1>
          <p
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 15,
              fontWeight: 300,
              color: 'rgba(249,245,240,0.72)',
              lineHeight: 1.8,
              textAlign: 'center',
              maxWidth: 320,
              position: 'relative',
            }}
          >
            Every conversation is the beginning of something beautiful. Reach out and let's craft something together.
          </p>
        </div>

        {/* Right — warm parchment with ornamental element */}
        <div
          style={{
            background: PARCHMENT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 60px',
            position: 'relative',
          }}
        >
          {/* Large decorative letter */}
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 220,
              fontWeight: 700,
              color: 'rgba(94,41,0,0.06)',
              position: 'absolute',
              right: 30,
              bottom: -20,
              lineHeight: 1,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          >
            H
          </div>
          <div style={{ position: 'relative' }}>
            <p
              style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: 'italic',
                fontSize: 22,
                color: DEEP_BROWN,
                lineHeight: 1.7,
                maxWidth: 340,
              }}
            >
              "Crafted with care, delivered with love — our artisans are always here to guide your journey."
            </p>
            <div
              style={{
                marginTop: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontFamily: "'Playfair Display', serif", color: WHITE, fontWeight: 700, fontSize: 14 }}>H</span>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: DEEP_BROWN }}>Harini Atelier</div>
                <div style={{ fontSize: 12, color: TEXT_LIGHT }}>Since 2015</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BREADCRUMB NAV ── */}
      <div
        style={{
          background: WHITE,
          borderBottom: `1px solid ${PARCHMENT}`,
          padding: '14px 80px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: TEXT_LIGHT,
        }}
      >
        <span>Home</span>
        <ChevronRight size={14} color={TEXT_LIGHT} />
        <span style={{ color: DEEP_BROWN, fontWeight: 500 }}>Contact Us</span>
      </div>

      {/* ── MAIN BODY ── */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '80px 40px',
          display: 'grid',
          gridTemplateColumns: '380px 1fr',
          gap: 60,
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN — Contact Details + Social */}
        <div>
          {/* Section header */}
          <div style={{ marginBottom: 40 }}>
            <div
              style={{
                display: 'inline-block',
                fontFamily: "'Poppins', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: GOLD_DARK,
                marginBottom: 12,
              }}
            >
              Get in Touch
            </div>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 34,
                fontWeight: 700,
                color: DEEP_BROWN,
                margin: '0 0 16px',
                lineHeight: 1.2,
              }}
            >
              Our Details
            </h2>
            <div
              style={{
                width: 48,
                height: 2,
                background: `linear-gradient(90deg, ${GOLD}, transparent)`,
                borderRadius: 1,
              }}
            />
            <p
              style={{
                marginTop: 16,
                fontSize: 14,
                lineHeight: 1.8,
                color: TEXT_MID,
                fontWeight: 300,
              }}
            >
              Have questions about our collections or need a personal styling consultation? We're just a message away.
            </p>
          </div>

          {/* Contact cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {contactDetails.map((item, i) => (
              <a
                key={i}
                href={item.href || '#'}
                target={item.href?.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 16,
                  padding: '20px 22px',
                  background: WHITE,
                  border: `1px solid ${PARCHMENT}`,
                  borderLeft: `3px solid ${GOLD}`,
                  borderRadius: 8,
                  textDecoration: 'none',
                  transition: 'box-shadow 0.2s',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${CREAM}, ${PARCHMENT})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: GOLD_DARK,
                    border: `1px solid ${PARCHMENT}`,
                  }}
                >
                  {item.icon}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: TEXT_LIGHT,
                      marginBottom: 4,
                    }}
                  >
                    {item.label}
                  </div>
                  <div style={{ fontSize: 14, color: TEXT_DARK, fontWeight: 500 }}>
                    {item.value}
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Social links */}
          <div
            style={{
              marginTop: 40,
              paddingTop: 32,
              borderTop: `1px solid ${PARCHMENT}`,
            }}
          >
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 20,
                color: DEEP_BROWN,
                margin: '0 0 18px',
              }}
            >
              Follow Our Story
            </h3>
            <div style={{ display: 'flex', gap: 12 }}>
              {socialLinks.map((s, i) => (
                <a
                  key={i}
                  href={s.href}
                  title={s.label}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    border: `1.5px solid ${GOLD}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: GOLD_DARK,
                    textDecoration: 'none',
                    background: WHITE,
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                  }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — Contact Form */}
        <div
          style={{
            background: WHITE,
            borderRadius: 12,
            padding: '52px 52px 48px',
            boxShadow: '0 4px 40px rgba(94,41,0,0.06)',
            border: `1px solid ${PARCHMENT}`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top gold accent */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: `linear-gradient(90deg, ${GOLD}, ${GOLD_DARK}, ${GOLD})`,
            }}
          />

          <div style={{ marginBottom: 36 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: GOLD_DARK,
                marginBottom: 10,
              }}
            >
              Send a Message
            </div>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 32,
                color: DEEP_BROWN,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Tell Us How We Can Help
            </h2>
          </div>

          <form onSubmit={e => e.preventDefault()}>
            {/* Row 1: Name + Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <FloatLabel
                label="Full Name *"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                active={activeField === 'name' || !!form.name}
                onFocus={() => setActiveField('name')}
                onBlur={() => setActiveField(null)}
              />
              <FloatLabel
                label="Email Address *"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                active={activeField === 'email' || !!form.email}
                onFocus={() => setActiveField('email')}
                onBlur={() => setActiveField(null)}
              />
            </div>

            {/* Row 2: Phone + Subject */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <FloatLabel
                label="Phone Number"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                active={activeField === 'phone' || !!form.phone}
                onFocus={() => setActiveField('phone')}
                onBlur={() => setActiveField(null)}
              />
              {/* Subject select */}
              <div style={{ position: 'relative' }}>
                <label
                  style={{
                    position: 'absolute',
                    top: activeField === 'subject' || !!form.subject ? 8 : '50%',
                    transform: activeField === 'subject' || !!form.subject ? 'none' : 'translateY(-50%)',
                    left: 18,
                    fontSize: activeField === 'subject' || !!form.subject ? 10 : 14,
                    fontWeight: activeField === 'subject' || !!form.subject ? 600 : 400,
                    color: activeField === 'subject' ? GOLD_DARK : TEXT_LIGHT,
                    letterSpacing: activeField === 'subject' || !!form.subject ? '0.1em' : 0,
                    textTransform: activeField === 'subject' || !!form.subject ? 'uppercase' : 'none',
                    transition: 'all 0.2s ease',
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}
                >
                  Subject *
                </label>
                <select
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  onFocus={() => setActiveField('subject')}
                  onBlur={() => setActiveField(null)}
                  style={{
                    width: '100%',
                    padding: form.subject || activeField === 'subject' ? '24px 18px 8px' : '16px 18px',
                    border: `1.5px solid ${activeField === 'subject' ? GOLD : PARCHMENT}`,
                    borderRadius: 8,
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: 14,
                    color: form.subject ? TEXT_DARK : 'transparent',
                    background: WHITE,
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    boxShadow: activeField === 'subject' ? `0 0 0 3px rgba(212,175,55,0.12)` : 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="" disabled />
                  {subjects.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Message */}
            <div style={{ position: 'relative', marginBottom: 28 }}>
              <label
                style={{
                  position: 'absolute',
                  top: activeField === 'message' || !!form.message ? 10 : 18,
                  left: 18,
                  fontSize: activeField === 'message' || !!form.message ? 10 : 14,
                  fontWeight: activeField === 'message' || !!form.message ? 600 : 400,
                  color: activeField === 'message' ? GOLD_DARK : TEXT_LIGHT,
                  letterSpacing: activeField === 'message' || !!form.message ? '0.1em' : 0,
                  textTransform: activeField === 'message' || !!form.message ? 'uppercase' : 'none',
                  transition: 'all 0.2s ease',
                  pointerEvents: 'none',
                }}
              >
                Message *
              </label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                onFocus={() => setActiveField('message')}
                onBlur={() => setActiveField(null)}
                rows={5}
                style={{
                  width: '100%',
                  padding: form.message || activeField === 'message' ? '30px 18px 12px' : '18px',
                  border: `1.5px solid ${activeField === 'message' ? GOLD : PARCHMENT}`,
                  borderRadius: 8,
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: 14,
                  color: TEXT_DARK,
                  background: WHITE,
                  outline: 'none',
                  resize: 'vertical',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxShadow: activeField === 'message' ? `0 0 0 3px rgba(212,175,55,0.12)` : 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                width: '100%',
                padding: '18px 32px',
                background: `linear-gradient(135deg, ${DEEP_BROWN} 0%, #3a1800 100%)`,
                color: CREAM,
                border: 'none',
                borderRadius: 8,
                fontFamily: "'Poppins', sans-serif",
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              <Send size={16} strokeWidth={2} />
              Send Your Message
            </button>

            <p
              style={{
                textAlign: 'center',
                marginTop: 16,
                fontSize: 12,
                color: TEXT_LIGHT,
              }}
            >
              We typically reply within 1–2 business days.
            </p>
          </form>
        </div>
      </div>

      {/* ── WORKING HOURS — Magazine Strip ── */}
      <section
        style={{
          background: `linear-gradient(135deg, ${DEEP_BROWN} 0%, #3a1800 100%)`,
          padding: '72px 80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background texture */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='30' cy='30' r='1.5' fill='%23d4af37' fill-opacity='0.06'/%3E%3C/svg%3E\")",
          }}
        />

        <div style={{ maxWidth: 1120, margin: '0 auto', position: 'relative' }}>
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              marginBottom: 52,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: `1.5px solid rgba(212,175,55,0.4)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: GOLD,
              }}
            >
              <Clock size={22} strokeWidth={1.5} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'rgba(212,175,55,0.7)',
                  marginBottom: 4,
                  fontWeight: 600,
                }}
              >
                We're open
              </div>
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 32,
                  color: CREAM,
                  margin: 0,
                  lineHeight: 1.1,
                }}
              >
                Working Hours
              </h2>
            </div>

            {/* Decorative rule */}
            <div
              style={{
                flex: 1,
                height: 1,
                background: 'linear-gradient(90deg, rgba(212,175,55,0.3), transparent)',
                marginLeft: 16,
              }}
            />
          </div>

          {/* Hours grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 20,
            }}
          >
            {hoursData.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: '32px 28px',
                  border: `1px solid rgba(212,175,55,0.2)`,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(4px)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* top-left gold corner accent */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 40,
                    height: 2,
                    background: `linear-gradient(90deg, ${GOLD}, transparent)`,
                  }}
                />
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: 'rgba(212,175,55,0.7)',
                    marginBottom: 10,
                    fontWeight: 600,
                  }}
                >
                  {item.days}
                </div>
                <div
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 22,
                    color: CREAM,
                    fontWeight: 500,
                  }}
                >
                  {item.time}
                </div>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <p
            style={{
              textAlign: 'center',
              marginTop: 36,
              fontSize: 13,
              color: 'rgba(249,245,240,0.4)',
              fontStyle: 'italic',
            }}
          >
            Hours may vary on public holidays — follow us on Instagram for updates.
          </p>
        </div>
      </section>

      {/* ── FOOTER STRIP ── */}
      <footer
        style={{
          background: '#1a0a00',
          padding: '28px 80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 18,
            color: CREAM,
            letterSpacing: '0.04em',
          }}
        >
          Harini Atelier
        </span>
        <span
          style={{
            fontSize: 12,
            color: 'rgba(249,245,240,0.35)',
          }}
        >
          © 2026 · Crafted with care
        </span>
      </footer>
    </div>
  );
}

/* ── Floating Label Input ── */
function FloatLabel({
  label,
  name,
  type,
  value,
  onChange,
  active,
  onFocus,
  onBlur,
}: {
  label: string;
  name: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  active: boolean;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const isActive = active;
  return (
    <div style={{ position: 'relative' }}>
      <label
        style={{
          position: 'absolute',
          top: isActive ? 8 : '50%',
          transform: isActive ? 'none' : 'translateY(-50%)',
          left: 18,
          fontSize: isActive ? 10 : 14,
          fontWeight: isActive ? 600 : 400,
          color: active && value === '' ? '#b8941f' : isActive && value ? '#b8941f' : '#9a7a5a',
          letterSpacing: isActive ? '0.1em' : 0,
          textTransform: isActive ? 'uppercase' : 'none',
          transition: 'all 0.2s ease',
          pointerEvents: 'none',
        }}
      >
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        style={{
          width: '100%',
          padding: isActive ? '24px 18px 8px' : '16px 18px',
          border: `1.5px solid ${isActive ? '#d4af37' : '#ede5d8'}`,
          borderRadius: 8,
          fontFamily: "'Poppins', sans-serif",
          fontSize: 14,
          color: '#2a1500',
          background: '#ffffff',
          outline: 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: isActive ? '0 0 0 3px rgba(212,175,55,0.12)' : 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}
