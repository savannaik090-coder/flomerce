import{d as N,u as M,b as E,r as v,i as B,j as e,N as I,A as V,T as t}from"./index-BM2j1440.js";import{P as A}from"./PhoneInput-bGTeh5x7.js";import{m as G,n as W}from"./index-Cb1VYc0E.js";const $=["11:00 AM","12:00 PM","01:00 PM","02:00 PM","03:00 PM","04:00 PM","05:00 PM","06:00 PM"];function z(o){if(!o||typeof o!="object")return"";const a=[];return o.pageBg&&a.push(`.book-appointment-page { background-color: ${o.pageBg}; }`),o.headingFont&&a.push(`.book-appointment-page .appointment-header h1,
      .book-appointment-page .form-section h3 { font-family: ${o.headingFont}; }`),o.headingColor&&a.push(`.book-appointment-page .appointment-header h1,
      .book-appointment-page .form-section h3 { color: ${o.headingColor}; }`),o.bodyFont&&a.push(`.book-appointment-page .appointment-header p,
      .book-appointment-page .appt-form-group label,
      .book-appointment-page .appt-form-group input,
      .book-appointment-page .appt-form-group select,
      .book-appointment-page .appt-form-group textarea,
      .book-appointment-page .type-option,
      .book-appointment-page .time-slot,
      .book-appointment-page .appt-submit-btn,
      .book-appointment-page .appt-status-msg { font-family: ${o.bodyFont}; }`),o.bodyColor&&a.push(`.book-appointment-page .appointment-header p,
      .book-appointment-page .type-option,
      .book-appointment-page .type-option strong,
      .book-appointment-page .type-option .type-desc,
      .book-appointment-page .time-slot,
      .book-appointment-page .appt-form-group label,
      .book-appointment-page .appt-form-group input,
      .book-appointment-page .appt-form-group select,
      .book-appointment-page .appt-form-group textarea { color: ${o.bodyColor}; }`),o.accentColor&&(a.push(`.book-appointment-page .type-option:hover,
      .book-appointment-page .type-option.selected,
      .book-appointment-page .time-slot:hover { border-color: ${o.accentColor}; }`),a.push(`.book-appointment-page .type-option.selected,
      .book-appointment-page .time-slot:hover { background-color: ${o.accentColor}1a; }`),a.push(`.book-appointment-page .type-option i { color: ${o.accentColor}; }`),a.push(`.book-appointment-page .time-slot.selected { background-color: ${o.accentColor}; border-color: ${o.accentColor}; color: #fff; }`),a.push(`.book-appointment-page .appt-submit-btn { background-color: ${o.accentColor}; }`),a.push(`.book-appointment-page .appt-submit-btn:hover { background-color: ${o.accentColor}; filter: brightness(0.9); }`)),a.join(`
`)}function O({overrides:o,PURPOSES:a,appointmentType:s,setAppointmentType:m,selectedTime:x,setSelectedTime:c,status:r,submitting:g,form:i,setForm:d,handleChange:l,handleSubmit:b,getMinDate:p}){const{translate:h}=N(),f=z(o);return e.jsxs("div",{className:"book-appointment-page",children:[e.jsx("style",{children:`
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
        ${f}
      `}),e.jsxs("div",{className:"appointment-container",children:[e.jsxs("div",{className:"appointment-header",children:[e.jsx("h1",{children:e.jsx(t,{text:"Book Your Appointment"})}),e.jsx("p",{children:e.jsx(t,{text:"Schedule a personalized consultation with our experts"})})]}),r&&e.jsxs("div",{className:`appt-status-msg ${r.type}`,children:[e.jsx("i",{className:`fas fa-${r.type==="success"?"check":"exclamation"}-circle`})," ",r.msg]}),e.jsxs("form",{className:"appointment-form",onSubmit:b,children:[e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:e.jsx(t,{text:"Appointment Type"})}),e.jsxs("div",{className:"appointment-type",children:[e.jsxs("div",{className:`type-option ${s==="in-store"?"selected":""}`,onClick:()=>m("in-store"),children:[e.jsx("i",{className:"fas fa-store"}),e.jsx("strong",{children:e.jsx(t,{text:"In-Store Visit"})}),e.jsx("div",{className:"type-desc",children:e.jsx(t,{text:"Visit our showroom"})})]}),e.jsxs("div",{className:`type-option ${s==="virtual"?"selected":""}`,onClick:()=>m("virtual"),children:[e.jsx("i",{className:"fas fa-video"}),e.jsx("strong",{children:e.jsx(t,{text:"Virtual Consultation"})}),e.jsx("div",{className:"type-desc",children:e.jsx(t,{text:"Video call consultation"})})]})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:e.jsx(t,{text:"Personal Information"})}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:e.jsx(t,{text:"Full Name *"})}),e.jsx("input",{type:"text",name:"fullName",value:i.fullName,onChange:l,required:!0})]}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:e.jsx(t,{text:"Email Address *"})}),e.jsx("input",{type:"email",name:"email",value:i.email,onChange:l,required:!0})]}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:e.jsx(t,{text:"Phone Number *"})}),e.jsx(A,{value:i.phone,onChange:n=>d(j=>({...j,phone:n})),countryCode:"IN"})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:e.jsx(t,{text:"Select Date & Time"})}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:e.jsx(t,{text:"Preferred Date *"})}),e.jsx("input",{type:"date",name:"appointmentDate",value:i.appointmentDate,onChange:l,min:p(),required:!0})]}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:e.jsx(t,{text:"Preferred Time Slot *"})}),e.jsx("div",{className:"time-slots",children:$.map(n=>e.jsx("div",{className:`time-slot ${x===n?"selected":""}`,onClick:()=>c(n),children:n},n))})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:e.jsx(t,{text:"Additional Details"})}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:e.jsx(t,{text:"Purpose of Visit"})}),e.jsx("select",{name:"purpose",value:i.purpose,onChange:l,children:a.map(n=>e.jsx("option",{value:n.value,children:n.label},n.value))})]}),e.jsxs("div",{className:"appt-form-group",children:[e.jsx("label",{children:e.jsx(t,{text:"Additional Notes"})}),e.jsx("textarea",{name:"notes",value:i.notes,onChange:l,placeholder:h("Any specific requirements or questions...")})]})]}),e.jsx("button",{type:"submit",className:"appt-submit-btn",disabled:g,children:g?e.jsx(t,{text:"Booking..."}):e.jsx(t,{text:"Book Appointment"})})]})]})]})}function F(o){const a={pageBg:"--appointment-page-bg",headingFont:"--appointment-heading-font",headingColor:"--appointment-heading-color",bodyFont:"--appointment-body-font",bodyColor:"--appointment-body-color",accentColor:"--appointment-accent-color"},s={};if(!o||typeof o!="object")return s;for(const[m,x]of Object.entries(a)){const c=o[m];c&&typeof c=="string"&&c!==""&&(s[x]=c)}return s}function q({overrides:o,PURPOSES:a,appointmentType:s,setAppointmentType:m,selectedTime:x,setSelectedTime:c,status:r,submitting:g,form:i,setForm:d,handleChange:l,handleSubmit:b,getMinDate:p}){const{translate:h}=N(),f=F(o);return e.jsxs("div",{className:"mn-appointment-page",style:f,children:[e.jsxs("section",{className:"mn-appointment-hero",children:[e.jsx("h1",{children:e.jsx(t,{text:"Book Your Appointment"})}),e.jsx("p",{children:e.jsx(t,{text:"Schedule a personalized consultation with our experts"})})]}),e.jsx("section",{className:"mn-appointment-section",children:e.jsxs("div",{className:"mn-appointment-container",children:[r&&e.jsxs("div",{className:`mn-appointment-status ${r.type}`,children:[e.jsx("i",{className:`fas fa-${r.type==="success"?"check":"exclamation"}-circle`})," ",r.msg]}),e.jsxs("form",{className:"mn-appointment-form",onSubmit:b,children:[e.jsxs("div",{className:"mn-appt-section",children:[e.jsx("h3",{children:e.jsx(t,{text:"Appointment Type"})}),e.jsxs("div",{className:"mn-appt-type-grid",children:[e.jsxs("div",{className:`mn-appt-type ${s==="in-store"?"selected":""}`,onClick:()=>m("in-store"),children:[e.jsx("i",{className:"fas fa-store"}),e.jsx("strong",{children:e.jsx(t,{text:"In-Store Visit"})}),e.jsx("div",{className:"mn-appt-type-desc",children:e.jsx(t,{text:"Visit our showroom"})})]}),e.jsxs("div",{className:`mn-appt-type ${s==="virtual"?"selected":""}`,onClick:()=>m("virtual"),children:[e.jsx("i",{className:"fas fa-video"}),e.jsx("strong",{children:e.jsx(t,{text:"Virtual Consultation"})}),e.jsx("div",{className:"mn-appt-type-desc",children:e.jsx(t,{text:"Video call consultation"})})]})]})]}),e.jsxs("div",{className:"mn-appt-section",children:[e.jsx("h3",{children:e.jsx(t,{text:"Personal Information"})}),e.jsxs("div",{className:"mn-appt-group",children:[e.jsx("label",{children:e.jsx(t,{text:"Full Name *"})}),e.jsx("input",{type:"text",name:"fullName",value:i.fullName,onChange:l,required:!0})]}),e.jsxs("div",{className:"mn-appt-group",children:[e.jsx("label",{children:e.jsx(t,{text:"Email Address *"})}),e.jsx("input",{type:"email",name:"email",value:i.email,onChange:l,required:!0})]}),e.jsxs("div",{className:"mn-appt-group",children:[e.jsx("label",{children:e.jsx(t,{text:"Phone Number *"})}),e.jsx(A,{value:i.phone,onChange:n=>d(j=>({...j,phone:n})),countryCode:"IN"})]})]}),e.jsxs("div",{className:"mn-appt-section",children:[e.jsx("h3",{children:e.jsx(t,{text:"Select Date & Time"})}),e.jsxs("div",{className:"mn-appt-group",children:[e.jsx("label",{children:e.jsx(t,{text:"Preferred Date *"})}),e.jsx("input",{type:"date",name:"appointmentDate",value:i.appointmentDate,onChange:l,min:p(),required:!0})]}),e.jsxs("div",{className:"mn-appt-group",children:[e.jsx("label",{children:e.jsx(t,{text:"Preferred Time Slot *"})}),e.jsx("div",{className:"mn-appt-slots",children:$.map(n=>e.jsx("div",{className:`mn-appt-slot ${x===n?"selected":""}`,onClick:()=>c(n),children:n},n))})]})]}),e.jsxs("div",{className:"mn-appt-section",children:[e.jsx("h3",{children:e.jsx(t,{text:"Additional Details"})}),e.jsxs("div",{className:"mn-appt-group",children:[e.jsx("label",{children:e.jsx(t,{text:"Purpose of Visit"})}),e.jsx("select",{name:"purpose",value:i.purpose,onChange:l,children:a.map(n=>e.jsx("option",{value:n.value,children:n.label},n.value))})]}),e.jsxs("div",{className:"mn-appt-group",children:[e.jsx("label",{children:e.jsx(t,{text:"Additional Notes"})}),e.jsx("textarea",{name:"notes",value:i.notes,onChange:l,placeholder:h("Any specific requirements or questions...")})]})]}),e.jsx("button",{type:"submit",className:"mn-appt-submit",disabled:g,children:g?e.jsx(t,{text:"Booking..."}):e.jsx(t,{text:"Book Appointment"})})]})]})})]})}function R(){const{translate:o}=N(),a=[{value:"",label:o("Select purpose")},{value:"consultation",label:o("General Consultation")},{value:"other",label:o("Other")}],{siteConfig:s}=M(),{isModern:m}=E(),[x,c]=v.useState(""),[r,g]=v.useState(""),[i,d]=v.useState(null),[l,b]=v.useState(!1),[p,h]=v.useState({fullName:"",email:"",phone:"",appointmentDate:"",purpose:"",notes:""}),f=B(s?.subscriptionPlan,"growth");if(s&&!f)return e.jsx(I,{to:"/",replace:!0});function n(u){h({...p,[u.target.name]:u.target.value})}function j(){const u=new Date;return u.setDate(u.getDate()+1),u.toISOString().split("T")[0]}async function T(u){if(u.preventDefault(),!x){d({type:"error",msg:o("Please select an appointment type.")});return}if(!r){d({type:"error",msg:o("Please select a time slot.")});return}b(!0),d(null);try{const w=a.find(D=>D.value===p.purpose)?.label||p.purpose,P=await fetch(`${V}/api/email/appointment`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:p.fullName,email:p.email,phone:p.phone,date:p.appointmentDate,time:r,notes:`Type: ${x}
Purpose: ${w}${p.notes?`
`+p.notes:""}`,siteEmail:s?.email,brandName:s?.brandName,siteId:s?.id})}),C=await P.json();P.ok&&C.success?(d({type:"success",msg:o("Your appointment has been booked successfully! We'll send you a confirmation shortly.")}),h({fullName:"",email:"",phone:"",appointmentDate:"",purpose:"",notes:""}),c(""),g("")):d({type:"error",msg:C.error||o("Something went wrong. Please try again.")})}catch{d({type:"error",msg:o("Something went wrong. Please try again.")})}finally{b(!1)}}let y=s?.settings||{};if(typeof y=="string")try{y=JSON.parse(y)}catch{y={}}const k=y.appointmentPage||{},S={overrides:m?k.modernStyle:k.classicStyle,PURPOSES:a,appointmentType:x,setAppointmentType:c,selectedTime:r,setSelectedTime:g,status:i,submitting:l,form:p,setForm:h,handleChange:n,handleSubmit:T,getMinDate:j};return m?e.jsx(q,{...S}):e.jsx(O,{...S})}export{G as APPOINTMENT_CLASSIC_STYLE_DEFAULTS,W as APPOINTMENT_MODERN_STYLE_DEFAULTS,R as default};
