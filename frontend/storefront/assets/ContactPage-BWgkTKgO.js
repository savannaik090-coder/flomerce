import{d as b,u as $,b as S,j as e,r as j,T as o,A as k}from"./index-CLXgIbal.js";import{u as F}from"./useSEO-C6OatOJy.js";import{P as v}from"./PhoneInput-BJ8DbiLl.js";import{C as E,m as M}from"./index-heC5pXk5.js";function z(t){const[n,r]=j.useState({name:"",email:"",phone:"",subject:"",message:""}),[i,s]=j.useState(null),[a,c]=j.useState(!1);function m(x){r({...n,[x.target.name]:x.target.value})}async function d(x){x.preventDefault(),c(!0),s(null);try{const l=await fetch(`${k}/api/email/contact`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:n.name,email:n.email,phone:n.phone,message:`${n.subject?`Subject: ${n.subject}

`:""}${n.message}`,siteEmail:t?.email,brandName:t?.brandName})}),h=await l.json();l.ok&&h.success?(s("success"),r({name:"",email:"",phone:"",subject:"",message:""})):s("error")}catch{s("error")}finally{c(!1)}}return{form:n,setForm:r,status:i,submitting:a,handleChange:m,handleSubmit:d}}function P(t,n){const r={...n};if(t&&typeof t=="object")for(const i of Object.keys(n)){const s=t[i];s!=null&&s!==""&&(r[i]=s)}return r}function T({style:t,brandName:n,phone:r,email:i,address:s,socialLinks:a,form:c,setForm:m,status:d,submitting:x,handleChange:l,handleSubmit:h}){const{translate:f}=b();return e.jsxs("div",{className:"contact-page",children:[e.jsx("style",{children:`
        .contact-hero {
          background: linear-gradient(135deg, #f9f5f0 0%, #ede5d8 100%);
          padding: 120px 0 80px; text-align: center;
          position: relative; overflow: hidden;
        }
        .contact-hero::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4af37' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          opacity: 0.3;
        }
        .contact-hero-content { position: relative; z-index: 2; }
        .contact-hero h1 {
          font-family: ${t.headingFont};
          font-size: 52px; color: ${t.headingColor}; margin-bottom: 20px;
          font-weight: 700; position: relative;
        }
        .contact-hero h1::after {
          content: ''; position: absolute; bottom: -15px; left: 50%;
          transform: translateX(-50%); width: 80px; height: 3px;
          background: ${t.accentColor}; border-radius: 2px;
        }
        .contact-hero p {
          font-family: ${t.bodyFont}; max-width: 700px;
          margin: 30px auto 0; font-size: 18px; color: ${t.bodyColor}; line-height: 1.7;
        }
        .contact-section { padding: 100px 0; background-color: ${t.pageBg}; }
        .contact-container {
          display: grid; grid-template-columns: 1fr 1fr; gap: 80px;
          max-width: 1200px; margin: 0 auto; padding: 0 20px;
        }
        .contact-info {
          background: ${t.infoCardBg};
          padding: 60px 40px; border-radius: 12px; position: relative; overflow: hidden;
        }
        .contact-info::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 4px; background: ${t.accentColor};
        }
        .contact-info h2 {
          font-family: ${t.headingFont}; font-size: 36px;
          color: ${t.headingColor}; margin-bottom: 30px;
        }
        .contact-info > p {
          font-family: ${t.bodyFont}; font-size: 16px;
          line-height: 1.7; color: ${t.bodyColor}; margin-bottom: 40px;
        }
        .contact-details { list-style: none; padding: 0; margin: 0; }
        .contact-details li {
          display: flex; align-items: center; margin-bottom: 25px;
          font-family: ${t.bodyFont};
        }
        .contact-details i { font-size: 20px; color: ${t.accentColor}; width: 30px; margin-right: 20px; }
        .contact-details span, .contact-details a {
          font-size: 16px; color: ${t.bodyColor}; text-decoration: none; transition: color 0.3s ease;
        }
        .contact-details a:hover { color: ${t.accentColor}; }
        .social-links-section {
          margin-top: 40px; padding-top: 30px;
          border-top: 1px solid rgba(212, 175, 55, 0.2);
        }
        .social-links-section h3 {
          font-family: ${t.headingFont}; font-size: 24px;
          color: ${t.headingColor}; margin-bottom: 20px;
        }
        .social-icons-row { display: flex; gap: 15px; }
        .social-icons-row a {
          display: flex; align-items: center; justify-content: center;
          width: 45px; height: 45px; background-color: ${t.accentColor};
          color: #fff; border-radius: 50%; text-decoration: none;
          transition: all 0.3s ease;
        }
        .social-icons-row a:hover { filter: brightness(0.85); transform: translateY(-3px); }
        .form-container {
          background-color: #fff; border-radius: 12px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.1);
          padding: 50px 40px; position: relative; overflow: hidden;
        }
        .form-container::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 4px; background: ${t.accentColor};
        }
        .form-container h2 {
          font-family: ${t.headingFont}; font-size: 36px;
          color: ${t.headingColor}; margin-bottom: 30px; text-align: center;
        }
        .form-group { margin-bottom: 25px; }
        .form-group label {
          display: block; font-family: ${t.bodyFont};
          font-size: 14px; font-weight: 500; color: ${t.bodyColor};
          margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .form-group input, .form-group textarea, .form-group select {
          width: 100%; padding: 15px 20px; border: 2px solid #e8e8e8;
          border-radius: 8px; font-family: ${t.bodyFont};
          font-size: 16px; color: ${t.bodyColor}; transition: all 0.3s ease;
          background-color: #fafafa; box-sizing: border-box;
        }
        .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
          outline: none; border-color: ${t.accentColor}; background-color: #fff;
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
        }
        .form-group textarea { resize: vertical; min-height: 120px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .contact-submit-btn {
          width: 100%; padding: 18px 30px;
          background: ${t.accentColor};
          color: #fff; border: none; border-radius: 8px;
          font-family: ${t.bodyFont}; font-size: 16px;
          font-weight: 600; text-transform: uppercase; letter-spacing: 1px;
          cursor: pointer; transition: all 0.3s ease; margin-top: 20px;
        }
        .contact-submit-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(212, 175, 55, 0.3); filter: brightness(0.92); }
        .contact-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .contact-status-msg {
          padding: 15px 20px; border-radius: 8px; margin-bottom: 20px;
          font-family: ${t.bodyFont}; font-weight: 500;
        }
        .contact-status-msg.success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .contact-status-msg.error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .working-hours {
          background-color: #5E2900; color: #fff; padding: 60px 0; text-align: center;
        }
        .working-hours h2 {
          font-family: ${t.headingFont}; font-size: 36px;
          color: ${t.accentColor}; margin-bottom: 30px;
        }
        .hours-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 30px; max-width: 800px; margin: 0 auto; padding: 0 20px;
        }
        .hours-item {
          background-color: rgba(255,255,255,0.1); padding: 30px 20px;
          border-radius: 8px; border: 1px solid rgba(212, 175, 55, 0.3);
        }
        .hours-item h3 {
          font-family: ${t.bodyFont}; font-size: 18px;
          font-weight: 600; margin-bottom: 10px; color: ${t.accentColor};
        }
        .hours-item p { font-family: ${t.bodyFont}; font-size: 16px; margin: 0; }
        @media (max-width: 991px) {
          .contact-container { grid-template-columns: 1fr; gap: 50px; }
          .form-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 767px) {
          .contact-hero { padding: 80px 0 60px; }
          .contact-hero h1 { font-size: 36px; }
          .contact-info, .form-container { padding: 40px 30px; }
          .contact-info h2, .form-container h2 { font-size: 28px; }
        }
      `}),e.jsx("section",{className:"contact-hero",children:e.jsx("div",{className:"container",children:e.jsxs("div",{className:"contact-hero-content",children:[e.jsx("h1",{children:e.jsx(o,{text:"Contact Us"})}),e.jsx("p",{children:e.jsx(o,{text:"Reach out to us for any inquiries. We'd love to hear from you."})})]})})}),e.jsx("section",{className:"contact-section",children:e.jsxs("div",{className:"contact-container",children:[e.jsxs("div",{className:"contact-info",children:[e.jsx("h2",{children:e.jsx(o,{text:"Get in Touch"})}),e.jsx("p",{children:e.jsx(o,{text:"Have questions about our collections? We're here to help you discover what you're looking for."})}),e.jsxs("ul",{className:"contact-details",children:[s&&e.jsxs("li",{children:[e.jsx("i",{className:"fas fa-map-marker-alt"}),e.jsx("span",{children:s})]}),r&&e.jsxs("li",{children:[e.jsx("i",{className:"fas fa-phone"}),e.jsx("a",{href:`tel:${r}`,children:r})]}),i&&e.jsxs("li",{children:[e.jsx("i",{className:"fas fa-envelope"}),e.jsx("a",{href:`mailto:${i}`,children:i})]}),r&&e.jsxs("li",{children:[e.jsx("i",{className:"fab fa-whatsapp"}),e.jsx("a",{href:`https://wa.me/${r.replace(/[^0-9]/g,"")}`,target:"_blank",rel:"noopener noreferrer",children:r})]})]}),(a.instagram||a.facebook||a.twitter||a.youtube)&&e.jsxs("div",{className:"social-links-section",children:[e.jsx("h3",{children:e.jsx(o,{text:"Follow Us"})}),e.jsxs("div",{className:"social-icons-row",children:[a.facebook&&e.jsx("a",{href:a.facebook,target:"_blank",rel:"noopener noreferrer",children:e.jsx("i",{className:"fab fa-facebook-f"})}),a.instagram&&e.jsx("a",{href:a.instagram,target:"_blank",rel:"noopener noreferrer",children:e.jsx("i",{className:"fab fa-instagram"})}),a.twitter&&e.jsx("a",{href:a.twitter,target:"_blank",rel:"noopener noreferrer",children:e.jsx("i",{className:"fab fa-twitter"})}),a.youtube&&e.jsx("a",{href:a.youtube,target:"_blank",rel:"noopener noreferrer",children:e.jsx("i",{className:"fab fa-youtube"})})]})]})]}),e.jsxs("div",{className:"form-container",children:[e.jsx("h2",{children:e.jsx(o,{text:"Send Us a Message"})}),d==="success"&&e.jsxs("div",{className:"contact-status-msg success",children:[e.jsx("i",{className:"fas fa-check-circle"})," ",e.jsx(o,{text:"Your message has been sent successfully!"})]}),d==="error"&&e.jsxs("div",{className:"contact-status-msg error",children:[e.jsx("i",{className:"fas fa-exclamation-circle"})," ",e.jsx(o,{text:"Something went wrong. Please try again."})]}),e.jsxs("form",{onSubmit:h,children:[e.jsxs("div",{className:"form-row",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:e.jsx(o,{text:"Full Name *"})}),e.jsx("input",{type:"text",name:"name",value:c.name,onChange:l,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:e.jsx(o,{text:"Email Address *"})}),e.jsx("input",{type:"email",name:"email",value:c.email,onChange:l,required:!0})]})]}),e.jsxs("div",{className:"form-row",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:e.jsx(o,{text:"Phone Number"})}),e.jsx(v,{value:c.phone,onChange:p=>m(u=>({...u,phone:p})),countryCode:"IN"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:e.jsx(o,{text:"Subject *"})}),e.jsx("input",{type:"text",name:"subject",value:c.subject,onChange:l,required:!0})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:e.jsx(o,{text:"Message *"})}),e.jsx("textarea",{name:"message",value:c.message,onChange:l,required:!0,placeholder:f("How can we help you?")})]}),e.jsx("button",{type:"submit",className:"contact-submit-btn",disabled:x,children:x?e.jsx(o,{text:"Sending..."}):e.jsx(o,{text:"Send Message"})})]})]})]})}),e.jsxs("section",{className:"working-hours",children:[e.jsx("h2",{children:e.jsx(o,{text:"Working Hours"})}),e.jsxs("div",{className:"hours-grid",children:[e.jsxs("div",{className:"hours-item",children:[e.jsx("h3",{children:e.jsx(o,{text:"Monday - Saturday"})}),e.jsx("p",{children:e.jsx(o,{text:"10:00 AM - 7:00 PM"})})]}),e.jsxs("div",{className:"hours-item",children:[e.jsx("h3",{children:e.jsx(o,{text:"Sunday"})}),e.jsx("p",{children:e.jsx(o,{text:"11:00 AM - 6:00 PM"})})]})]})]})]})}function _(t){return{"--contact-page-bg":t.pageBg,"--contact-heading-font":t.headingFont,"--contact-heading-color":t.headingColor,"--contact-body-font":t.bodyFont,"--contact-body-color":t.bodyColor,"--contact-accent-color":t.accentColor,"--contact-form-border-color":t.formBorderColor}}function A({style:t,brandName:n,phone:r,email:i,address:s,socialLinks:a,form:c,setForm:m,status:d,submitting:x,handleChange:l,handleSubmit:h}){const{translate:f}=b(),p=_(t);return e.jsxs("div",{style:p,children:[e.jsxs("section",{className:"mn-contact-hero",children:[e.jsx("h1",{children:e.jsx(o,{text:"Contact Us"})}),e.jsx("p",{children:e.jsx(o,{text:"Reach out to us for any inquiries. We'd love to hear from you."})})]}),e.jsx("section",{className:"mn-contact-section",children:e.jsxs("div",{className:"mn-contact-container",children:[e.jsxs("div",{className:"mn-contact-info",children:[e.jsx("h2",{children:e.jsx(o,{text:"Get in Touch"})}),e.jsx("p",{children:e.jsx(o,{text:"Have questions about our collections? We're here to help you discover what you're looking for."})}),e.jsxs("ul",{className:"mn-contact-details",children:[s&&e.jsxs("li",{children:[e.jsx("i",{className:"fas fa-map-marker-alt"}),e.jsx("span",{children:s})]}),r&&e.jsxs("li",{children:[e.jsx("i",{className:"fas fa-phone"}),e.jsx("a",{href:`tel:${r}`,children:r})]}),i&&e.jsxs("li",{children:[e.jsx("i",{className:"fas fa-envelope"}),e.jsx("a",{href:`mailto:${i}`,children:i})]}),r&&e.jsxs("li",{children:[e.jsx("i",{className:"fab fa-whatsapp"}),e.jsx("a",{href:`https://wa.me/${r.replace(/[^0-9]/g,"")}`,target:"_blank",rel:"noopener noreferrer",children:r})]})]}),(a.instagram||a.facebook||a.twitter||a.youtube)&&e.jsxs("div",{className:"mn-contact-social",children:[e.jsx("h3",{children:e.jsx(o,{text:"Follow Us"})}),e.jsxs("div",{className:"mn-contact-social-icons",children:[a.facebook&&e.jsx("a",{href:a.facebook,target:"_blank",rel:"noopener noreferrer",children:e.jsx("i",{className:"fab fa-facebook-f"})}),a.instagram&&e.jsx("a",{href:a.instagram,target:"_blank",rel:"noopener noreferrer",children:e.jsx("i",{className:"fab fa-instagram"})}),a.twitter&&e.jsx("a",{href:a.twitter,target:"_blank",rel:"noopener noreferrer",children:e.jsx("i",{className:"fab fa-twitter"})}),a.youtube&&e.jsx("a",{href:a.youtube,target:"_blank",rel:"noopener noreferrer",children:e.jsx("i",{className:"fab fa-youtube"})})]})]})]}),e.jsxs("div",{className:"mn-contact-form",children:[e.jsx("h2",{children:e.jsx(o,{text:"Send Us a Message"})}),d==="success"&&e.jsxs("div",{className:"mn-contact-status success",children:[e.jsx("i",{className:"fas fa-check-circle"})," ",e.jsx(o,{text:"Your message has been sent successfully!"})]}),d==="error"&&e.jsxs("div",{className:"mn-contact-status error",children:[e.jsx("i",{className:"fas fa-exclamation-circle"})," ",e.jsx(o,{text:"Something went wrong. Please try again."})]}),e.jsxs("form",{onSubmit:h,children:[e.jsxs("div",{className:"mn-form-row",children:[e.jsxs("div",{className:"mn-form-group",children:[e.jsx("label",{children:e.jsx(o,{text:"Full Name *"})}),e.jsx("input",{type:"text",name:"name",value:c.name,onChange:l,required:!0})]}),e.jsxs("div",{className:"mn-form-group",children:[e.jsx("label",{children:e.jsx(o,{text:"Email Address *"})}),e.jsx("input",{type:"email",name:"email",value:c.email,onChange:l,required:!0})]})]}),e.jsxs("div",{className:"mn-form-row",children:[e.jsxs("div",{className:"mn-form-group",children:[e.jsx("label",{children:e.jsx(o,{text:"Phone Number"})}),e.jsx(v,{value:c.phone,onChange:u=>m(g=>({...g,phone:u})),countryCode:"IN"})]}),e.jsxs("div",{className:"mn-form-group",children:[e.jsx("label",{children:e.jsx(o,{text:"Subject *"})}),e.jsx("input",{type:"text",name:"subject",value:c.subject,onChange:l,required:!0})]})]}),e.jsxs("div",{className:"mn-form-group",children:[e.jsx("label",{children:e.jsx(o,{text:"Message *"})}),e.jsx("textarea",{name:"message",value:c.message,onChange:l,required:!0,placeholder:f("How can we help you?")})]}),e.jsx("button",{type:"submit",className:"mn-contact-submit",disabled:x,children:x?e.jsx(o,{text:"Sending..."}):e.jsx(o,{text:"Send Message"})})]})]})]})}),e.jsxs("section",{className:"mn-working-hours",children:[e.jsx("h2",{children:e.jsx(o,{text:"Working Hours"})}),e.jsxs("div",{className:"mn-hours-grid",children:[e.jsxs("div",{className:"mn-hours-item",children:[e.jsx("h3",{children:e.jsx(o,{text:"Monday - Saturday"})}),e.jsx("p",{children:e.jsx(o,{text:"10:00 AM - 7:00 PM"})})]}),e.jsxs("div",{className:"mn-hours-item",children:[e.jsx("h3",{children:e.jsx(o,{text:"Sunday"})}),e.jsx("p",{children:e.jsx(o,{text:"11:00 AM - 6:00 PM"})})]})]})]})]})}function W(){const{translate:t}=b(),{siteConfig:n}=$(),{isModern:r}=S();F({title:t("Contact Us"),pageType:"contact"});const i=n?.brandName||"Our Store",s=n?.phone||"",a=n?.email||"",c=n?.address||"",m=n?.socialLinks||{};let d=n?.settings||{};if(typeof d=="string")try{d=JSON.parse(d)}catch{d={}}const x=d.contactPage||{},l=r?E:M,h=r?x.modernStyle:x.classicStyle,f=P(h,l),{form:p,setForm:u,status:g,submitting:w,handleChange:y,handleSubmit:C}=z(n),N={style:f,brandName:i,phone:s,email:a,address:c,socialLinks:m,form:p,setForm:u,status:g,submitting:w,handleChange:y,handleSubmit:C};return r?e.jsx(A,{...N}):e.jsx(T,{...N})}export{W as default};
