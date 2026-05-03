import{d as k,u as w,r as p,i as T,j as e,N as C,T as o,A}from"./index-B9RtIcVc.js";import{P as D}from"./PhoneInput-DFwGzmpF.js";const z=["11:00 AM","12:00 PM","01:00 PM","02:00 PM","03:00 PM","04:00 PM","05:00 PM","06:00 PM"];function I(){const{translate:a}=k(),f=[{value:"",label:a("Select purpose")},{value:"consultation",label:a("General Consultation")},{value:"other",label:a("Other")}],{siteConfig:r}=w(),[l,d]=p.useState(""),[m,g]=p.useState(""),[c,n]=p.useState(null),[h,b]=p.useState(!1),[s,x]=p.useState({fullName:"",email:"",phone:"",appointmentDate:"",purpose:"",notes:""}),v=T(r?.subscriptionPlan,"growth");if(r&&!v)return e.jsx(C,{to:"/",replace:!0});function i(t){x({...s,[t.target.name]:t.target.value})}function N(){const t=new Date;return t.setDate(t.getDate()+1),t.toISOString().split("T")[0]}async function P(t){if(t.preventDefault(),!l){n({type:"error",msg:a("Please select an appointment type.")});return}if(!m){n({type:"error",msg:a("Please select a time slot.")});return}b(!0),n(null);try{const u=f.find(S=>S.value===s.purpose)?.label||s.purpose,j=await fetch(`${A}/api/email/appointment`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:s.fullName,email:s.email,phone:s.phone,date:s.appointmentDate,time:m,notes:`Type: ${l}
Purpose: ${u}${s.notes?`
`+s.notes:""}`,siteEmail:r?.email,brandName:r?.brandName,siteId:r?.id})}),y=await j.json();j.ok&&y.success?(n({type:"success",msg:a("Your appointment has been booked successfully! We'll send you a confirmation shortly.")}),x({fullName:"",email:"",phone:"",appointmentDate:"",purpose:"",notes:""}),d(""),g("")):n({type:"error",msg:y.error||a("Something went wrong. Please try again.")})}catch{n({type:"error",msg:a("Something went wrong. Please try again.")})}finally{b(!1)}}return e.jsxs("div",{className:"book-appointment-page",children:[e.jsx("style",{children:`
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
      `}),e.jsxs("div",{className:"appointment-container",children:[e.jsxs("div",{className:"appointment-header",children:[e.jsx("h1",{children:e.jsx(o,{text:"Book Your Appointment"})}),e.jsx("p",{children:e.jsx(o,{text:"Schedule a personalized consultation with our experts"})})]}),c&&e.jsxs("div",{className:`appt-status-msg ${c.type}`,children:[e.jsx("i",{className:`fas fa-${c.type==="success"?"check":"exclamation"}-circle`})," ",c.msg]}),e.jsxs("form",{className:"appointment-form",onSubmit:P,children:[e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:e.jsx(o,{text:"Appointment Type"})}),e.jsxs("div",{className:"appointment-type",children:[e.jsxs("div",{className:`type-option ${l==="in-store"?"selected":""}`,onClick:()=>d("in-store"),children:[e.jsx("i",{className:"fas fa-store"}),e.jsx("strong",{children:e.jsx(o,{text:"In-Store Visit"})}),e.jsx("div",{className:"type-desc",children:e.jsx(o,{text:"Visit our showroom"})})]}),e.jsxs("div",{className:`type-option ${l==="virtual"?"selected":""}`,onClick:()=>d("virtual"),children:[e.jsx("i",{className:"fas fa-video"}),e.jsx("strong",{children:e.jsx(o,{text:"Virtual Consultation"})}),e.jsx("div",{className:"type-desc",children:e.jsx(o,{text:"Video call consultation"})})]})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:e.jsx(o,{text:"Personal Information"})}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:e.jsx(o,{text:"Full Name *"})}),e.jsx("input",{type:"text",name:"fullName",value:s.fullName,onChange:i,required:!0})]}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:e.jsx(o,{text:"Email Address *"})}),e.jsx("input",{type:"email",name:"email",value:s.email,onChange:i,required:!0})]}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:e.jsx(o,{text:"Phone Number *"})}),e.jsx(D,{value:s.phone,onChange:t=>x(u=>({...u,phone:t})),countryCode:"IN"})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:e.jsx(o,{text:"Select Date & Time"})}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:e.jsx(o,{text:"Preferred Date *"})}),e.jsx("input",{type:"date",name:"appointmentDate",value:s.appointmentDate,onChange:i,min:N(),required:!0})]}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:e.jsx(o,{text:"Preferred Time Slot *"})}),e.jsx("div",{className:"time-slots",children:z.map(t=>e.jsx("div",{className:`time-slot ${m===t?"selected":""}`,onClick:()=>g(t),children:t},t))})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:e.jsx(o,{text:"Additional Details"})}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:e.jsx(o,{text:"Purpose of Visit"})}),e.jsx("select",{name:"purpose",value:s.purpose,onChange:i,children:f.map(t=>e.jsx("option",{value:t.value,children:t.label},t.value))})]}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:e.jsx(o,{text:"Additional Notes"})}),e.jsx("textarea",{name:"notes",value:s.notes,onChange:i,placeholder:a("Any specific requirements or questions...")})]})]}),e.jsx("button",{type:"submit",className:"appt-submit-btn",disabled:h,children:h?e.jsx(o,{text:"Booking..."}):e.jsx(o,{text:"Book Appointment"})})]})]})]})}export{I as default};
