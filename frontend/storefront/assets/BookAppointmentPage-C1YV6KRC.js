import{u as j,r,j as e}from"./index-DcoQzGkz.js";const y=["11:00 AM","12:00 PM","01:00 PM","02:00 PM","03:00 PM","04:00 PM","05:00 PM","06:00 PM"],v=[{value:"",label:"Select purpose"},{value:"browse",label:"Browse Collection"},{value:"custom",label:"Custom Design"},{value:"repair",label:"Repair & Restoration"},{value:"consultation",label:"General Consultation"},{value:"wedding",label:"Wedding / Bridal"},{value:"gift",label:"Gift Selection"},{value:"other",label:"Other"}];function k(){const{siteConfig:f}=j(),[n,l]=r.useState(""),[p,c]=r.useState(""),[i,s]=r.useState(null),[d,m]=r.useState(!1),[o,u]=r.useState({fullName:"",email:"",phone:"",appointmentDate:"",purpose:"",notes:""});function a(t){u({...o,[t.target.name]:t.target.value})}function g(){const t=new Date;return t.setDate(t.getDate()+1),t.toISOString().split("T")[0]}async function h(t){if(t.preventDefault(),!n){s({type:"error",msg:"Please select an appointment type."});return}if(!p){s({type:"error",msg:"Please select a time slot."});return}m(!0),s(null);try{const x=f?.phone?.replace(/[^0-9]/g,"")||"",b=`Appointment Request%0AType: ${n}%0AName: ${o.fullName}%0AEmail: ${o.email}%0APhone: ${o.phone}%0ADate: ${o.appointmentDate}%0ATime: ${p}%0APurpose: ${o.purpose}%0ANotes: ${o.notes}`;x&&window.open(`https://wa.me/${x}?text=${b}`,"_blank"),s({type:"success",msg:"Your appointment has been booked successfully! We'll send you a confirmation shortly."}),u({fullName:"",email:"",phone:"",appointmentDate:"",purpose:"",notes:""}),l(""),c("")}catch{s({type:"error",msg:"Something went wrong. Please try again."})}finally{m(!1)}}return e.jsxs("div",{className:"book-appointment-page",children:[e.jsx("style",{children:`
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
      `}),e.jsxs("div",{className:"appointment-container",children:[e.jsxs("div",{className:"appointment-header",children:[e.jsx("h1",{children:"Book Your Appointment"}),e.jsx("p",{children:"Schedule a personalized consultation with our experts"})]}),i&&e.jsxs("div",{className:`appt-status-msg ${i.type}`,children:[e.jsx("i",{className:`fas fa-${i.type==="success"?"check":"exclamation"}-circle`})," ",i.msg]}),e.jsxs("form",{className:"appointment-form",onSubmit:h,children:[e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Appointment Type"}),e.jsxs("div",{className:"appointment-type",children:[e.jsxs("div",{className:`type-option ${n==="in-store"?"selected":""}`,onClick:()=>l("in-store"),children:[e.jsx("i",{className:"fas fa-store"}),e.jsx("strong",{children:"In-Store Visit"}),e.jsx("div",{className:"type-desc",children:"Visit our showroom"})]}),e.jsxs("div",{className:`type-option ${n==="virtual"?"selected":""}`,onClick:()=>l("virtual"),children:[e.jsx("i",{className:"fas fa-video"}),e.jsx("strong",{children:"Virtual Consultation"}),e.jsx("div",{className:"type-desc",children:"Video call consultation"})]})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Personal Information"}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:"Full Name *"}),e.jsx("input",{type:"text",name:"fullName",value:o.fullName,onChange:a,required:!0})]}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:"Email Address *"}),e.jsx("input",{type:"email",name:"email",value:o.email,onChange:a,required:!0})]}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:"Phone Number *"}),e.jsx("input",{type:"tel",name:"phone",value:o.phone,onChange:a,required:!0})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Select Date & Time"}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:"Preferred Date *"}),e.jsx("input",{type:"date",name:"appointmentDate",value:o.appointmentDate,onChange:a,min:g(),required:!0})]}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:"Preferred Time Slot *"}),e.jsx("div",{className:"time-slots",children:y.map(t=>e.jsx("div",{className:`time-slot ${p===t?"selected":""}`,onClick:()=>c(t),children:t},t))})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Additional Details"}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:"Purpose of Visit"}),e.jsx("select",{name:"purpose",value:o.purpose,onChange:a,children:v.map(t=>e.jsx("option",{value:t.value,children:t.label},t.value))})]}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:"Additional Notes"}),e.jsx("textarea",{name:"notes",value:o.notes,onChange:a,placeholder:"Any specific requirements or questions..."})]})]}),e.jsx("button",{type:"submit",className:"appt-submit-btn",disabled:d,children:d?"Booking...":"Book Appointment"})]})]})]})}export{k as default};
