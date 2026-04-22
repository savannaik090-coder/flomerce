import{u as P,r,i as S,j as e,N as k,A as w}from"./index-FoNs60hK.js";import{P as C}from"./PhoneInput-DStfcfDB.js";const A=["11:00 AM","12:00 PM","01:00 PM","02:00 PM","03:00 PM","04:00 PM","05:00 PM","06:00 PM"],b=[{value:"",label:"Select purpose"},{value:"consultation",label:"General Consultation"},{value:"other",label:"Other"}];function z(){const{siteConfig:s}=P(),[i,l]=r.useState(""),[c,u]=r.useState(""),[p,a]=r.useState(null),[x,f]=r.useState(!1),[o,m]=r.useState({fullName:"",email:"",phone:"",appointmentDate:"",purpose:"",notes:""}),y=S(s?.subscriptionPlan,"growth");if(s&&!y)return e.jsx(k,{to:"/",replace:!0});function n(t){m({...o,[t.target.name]:t.target.value})}function j(){const t=new Date;return t.setDate(t.getDate()+1),t.toISOString().split("T")[0]}async function v(t){if(t.preventDefault(),!i){a({type:"error",msg:"Please select an appointment type."});return}if(!c){a({type:"error",msg:"Please select a time slot."});return}f(!0),a(null);try{const d=b.find(N=>N.value===o.purpose)?.label||o.purpose,g=await fetch(`${w}/api/email/appointment`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:o.fullName,email:o.email,phone:o.phone,date:o.appointmentDate,time:c,notes:`Type: ${i}
Purpose: ${d}${o.notes?`
`+o.notes:""}`,siteEmail:s?.email,brandName:s?.brandName,siteId:s?.id})}),h=await g.json();g.ok&&h.success?(a({type:"success",msg:"Your appointment has been booked successfully! We'll send you a confirmation shortly."}),m({fullName:"",email:"",phone:"",appointmentDate:"",purpose:"",notes:""}),l(""),u("")):a({type:"error",msg:h.error||"Something went wrong. Please try again."})}catch{a({type:"error",msg:"Something went wrong. Please try again."})}finally{f(!1)}}return e.jsxs("div",{className:"book-appointment-page",children:[e.jsx("style",{children:`
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
      `}),e.jsxs("div",{className:"appointment-container",children:[e.jsxs("div",{className:"appointment-header",children:[e.jsx("h1",{children:"Book Your Appointment"}),e.jsx("p",{children:"Schedule a personalized consultation with our experts"})]}),p&&e.jsxs("div",{className:`appt-status-msg ${p.type}`,children:[e.jsx("i",{className:`fas fa-${p.type==="success"?"check":"exclamation"}-circle`})," ",p.msg]}),e.jsxs("form",{className:"appointment-form",onSubmit:v,children:[e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Appointment Type"}),e.jsxs("div",{className:"appointment-type",children:[e.jsxs("div",{className:`type-option ${i==="in-store"?"selected":""}`,onClick:()=>l("in-store"),children:[e.jsx("i",{className:"fas fa-store"}),e.jsx("strong",{children:"In-Store Visit"}),e.jsx("div",{className:"type-desc",children:"Visit our showroom"})]}),e.jsxs("div",{className:`type-option ${i==="virtual"?"selected":""}`,onClick:()=>l("virtual"),children:[e.jsx("i",{className:"fas fa-video"}),e.jsx("strong",{children:"Virtual Consultation"}),e.jsx("div",{className:"type-desc",children:"Video call consultation"})]})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Personal Information"}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:"Full Name *"}),e.jsx("input",{type:"text",name:"fullName",value:o.fullName,onChange:n,required:!0})]}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:"Email Address *"}),e.jsx("input",{type:"email",name:"email",value:o.email,onChange:n,required:!0})]}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:"Phone Number *"}),e.jsx(C,{value:o.phone,onChange:t=>m(d=>({...d,phone:t})),countryCode:"IN"})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Select Date & Time"}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:"Preferred Date *"}),e.jsx("input",{type:"date",name:"appointmentDate",value:o.appointmentDate,onChange:n,min:j(),required:!0})]}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:"Preferred Time Slot *"}),e.jsx("div",{className:"time-slots",children:A.map(t=>e.jsx("div",{className:`time-slot ${c===t?"selected":""}`,onClick:()=>u(t),children:t},t))})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Additional Details"}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:"Purpose of Visit"}),e.jsx("select",{name:"purpose",value:o.purpose,onChange:n,children:b.map(t=>e.jsx("option",{value:t.value,children:t.label},t.value))})]}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:"Additional Notes"}),e.jsx("textarea",{name:"notes",value:o.notes,onChange:n,placeholder:"Any specific requirements or questions..."})]})]}),e.jsx("button",{type:"submit",className:"appt-submit-btn",disabled:x,children:x?"Booking...":"Book Appointment"})]})]})]})}export{z as default};
