import{b as S,u as k,r,i as w,j as e,N as D,A as T}from"./index-CzvBZNtj.js";import{P as C}from"./PhoneInput-B-qNfSRg.js";const A=["11:00 AM","12:00 PM","01:00 PM","02:00 PM","03:00 PM","04:00 PM","05:00 PM","06:00 PM"];function $(){const{t}=S("storefront"),f=[{value:"",label:t("appointment.purposes.select","Select purpose")},{value:"consultation",label:t("appointment.purposes.consultation","General Consultation")},{value:"other",label:t("appointment.purposes.other","Other")}],{siteConfig:s}=k(),[p,m]=r.useState(""),[c,x]=r.useState(""),[l,a]=r.useState(null),[g,h]=r.useState(!1),[n,d]=r.useState({fullName:"",email:"",phone:"",appointmentDate:"",purpose:"",notes:""}),j=w(s?.subscriptionPlan,"growth");if(s&&!j)return e.jsx(D,{to:"/",replace:!0});function i(o){d({...n,[o.target.name]:o.target.value})}function v(){const o=new Date;return o.setDate(o.getDate()+1),o.toISOString().split("T")[0]}async function N(o){if(o.preventDefault(),!p){a({type:"error",msg:t("appointment.errors.selectType","Please select an appointment type.")});return}if(!c){a({type:"error",msg:t("appointment.errors.selectTime","Please select a time slot.")});return}h(!0),a(null);try{const u=f.find(P=>P.value===n.purpose)?.label||n.purpose,b=await fetch(`${T}/api/email/appointment`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:n.fullName,email:n.email,phone:n.phone,date:n.appointmentDate,time:c,notes:`Type: ${p}
Purpose: ${u}${n.notes?`
`+n.notes:""}`,siteEmail:s?.email,brandName:s?.brandName,siteId:s?.id})}),y=await b.json();b.ok&&y.success?(a({type:"success",msg:t("appointment.success","Your appointment has been booked successfully! We'll send you a confirmation shortly.")}),d({fullName:"",email:"",phone:"",appointmentDate:"",purpose:"",notes:""}),m(""),x("")):a({type:"error",msg:y.error||t("appointment.errors.generic","Something went wrong. Please try again.")})}catch{a({type:"error",msg:t("appointment.errors.generic","Something went wrong. Please try again.")})}finally{h(!1)}}return e.jsxs("div",{className:"book-appointment-page",children:[e.jsx("style",{children:`
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
      `}),e.jsxs("div",{className:"appointment-container",children:[e.jsxs("div",{className:"appointment-header",children:[e.jsx("h1",{children:t("appointment.title","Book Your Appointment")}),e.jsx("p",{children:t("appointment.subtitle","Schedule a personalized consultation with our experts")})]}),l&&e.jsxs("div",{className:`appt-status-msg ${l.type}`,children:[e.jsx("i",{className:`fas fa-${l.type==="success"?"check":"exclamation"}-circle`})," ",l.msg]}),e.jsxs("form",{className:"appointment-form",onSubmit:N,children:[e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:t("appointment.type.heading","Appointment Type")}),e.jsxs("div",{className:"appointment-type",children:[e.jsxs("div",{className:`type-option ${p==="in-store"?"selected":""}`,onClick:()=>m("in-store"),children:[e.jsx("i",{className:"fas fa-store"}),e.jsx("strong",{children:t("appointment.type.inStore","In-Store Visit")}),e.jsx("div",{className:"type-desc",children:t("appointment.type.inStoreDesc","Visit our showroom")})]}),e.jsxs("div",{className:`type-option ${p==="virtual"?"selected":""}`,onClick:()=>m("virtual"),children:[e.jsx("i",{className:"fas fa-video"}),e.jsx("strong",{children:t("appointment.type.virtual","Virtual Consultation")}),e.jsx("div",{className:"type-desc",children:t("appointment.type.virtualDesc","Video call consultation")})]})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:t("appointment.personal.heading","Personal Information")}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:t("appointment.form.fullName","Full Name *")}),e.jsx("input",{type:"text",name:"fullName",value:n.fullName,onChange:i,required:!0})]}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:t("appointment.form.email","Email Address *")}),e.jsx("input",{type:"email",name:"email",value:n.email,onChange:i,required:!0})]}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:t("appointment.form.phone","Phone Number *")}),e.jsx(C,{value:n.phone,onChange:o=>d(u=>({...u,phone:o})),countryCode:"IN"})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:t("appointment.dateTime.heading","Select Date & Time")}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:t("appointment.form.date","Preferred Date *")}),e.jsx("input",{type:"date",name:"appointmentDate",value:n.appointmentDate,onChange:i,min:v(),required:!0})]}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:t("appointment.form.time","Preferred Time Slot *")}),e.jsx("div",{className:"time-slots",children:A.map(o=>e.jsx("div",{className:`time-slot ${c===o?"selected":""}`,onClick:()=>x(o),children:o},o))})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:t("appointment.details.heading","Additional Details")}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:t("appointment.form.purpose","Purpose of Visit")}),e.jsx("select",{name:"purpose",value:n.purpose,onChange:i,children:f.map(o=>e.jsx("option",{value:o.value,children:o.label},o.value))})]}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:t("appointment.form.notes","Additional Notes")}),e.jsx("textarea",{name:"notes",value:n.notes,onChange:i,placeholder:t("appointment.form.notesPlaceholder","Any specific requirements or questions...")})]})]}),e.jsx("button",{type:"submit",className:"appt-submit-btn",disabled:g,children:g?t("appointment.buttons.booking","Booking..."):t("appointment.buttons.book","Book Appointment")})]})]})]})}export{$ as default};
