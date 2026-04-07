import{u as h,b as u,j as e,r as p,A as g}from"./index-SsWNzhu6.js";import{u as b}from"./useSEO-BWKxyKY1.js";function j(o){const[n,s]=p.useState({name:"",email:"",phone:"",subject:"",message:""}),[c,i]=p.useState(null),[a,t]=p.useState(!1);function l(r){s({...n,[r.target.name]:r.target.value})}async function d(r){r.preventDefault(),t(!0),i(null);try{const m=await fetch(`${g}/api/email/contact`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:n.name,email:n.email,phone:n.phone,message:`${n.subject?`Subject: ${n.subject}

`:""}${n.message}`,siteEmail:o?.email,brandName:o?.brandName})}),f=await m.json();m.ok&&f.success?(i("success"),s({name:"",email:"",phone:"",subject:"",message:""})):i("error")}catch{i("error")}finally{t(!1)}}return{form:n,status:c,submitting:a,handleChange:l,handleSubmit:d}}function y({siteConfig:o,brandName:n,phone:s,email:c,address:i,socialLinks:a,form:t,status:l,submitting:d,handleChange:r,handleSubmit:m}){return e.jsxs("div",{className:"contact-page",children:[e.jsx("style",{children:`
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
          font-family: 'Playfair Display', serif;
          font-size: 52px; color: #5E2900; margin-bottom: 20px;
          font-weight: 700; position: relative;
        }
        .contact-hero h1::after {
          content: ''; position: absolute; bottom: -15px; left: 50%;
          transform: translateX(-50%); width: 80px; height: 3px;
          background: linear-gradient(90deg, #d4af37, #b8941f); border-radius: 2px;
        }
        .contact-hero p {
          font-family: 'Poppins', sans-serif; max-width: 700px;
          margin: 30px auto 0; font-size: 18px; color: #8a8a8a; line-height: 1.7;
        }
        .contact-section { padding: 100px 0; background-color: #fff; }
        .contact-container {
          display: grid; grid-template-columns: 1fr 1fr; gap: 80px;
          max-width: 1200px; margin: 0 auto; padding: 0 20px;
        }
        .contact-info {
          background: linear-gradient(135deg, #f9f5f0 0%, #ede5d8 100%);
          padding: 60px 40px; border-radius: 12px; position: relative; overflow: hidden;
        }
        .contact-info::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 4px; background: linear-gradient(90deg, #d4af37, #b8941f);
        }
        .contact-info h2 {
          font-family: 'Playfair Display', serif; font-size: 36px;
          color: #5E2900; margin-bottom: 30px;
        }
        .contact-info > p {
          font-family: 'Poppins', sans-serif; font-size: 16px;
          line-height: 1.7; color: #666; margin-bottom: 40px;
        }
        .contact-details { list-style: none; padding: 0; margin: 0; }
        .contact-details li {
          display: flex; align-items: center; margin-bottom: 25px;
          font-family: 'Poppins', sans-serif;
        }
        .contact-details i { font-size: 20px; color: #d4af37; width: 30px; margin-right: 20px; }
        .contact-details span, .contact-details a {
          font-size: 16px; color: #444; text-decoration: none; transition: color 0.3s ease;
        }
        .contact-details a:hover { color: #d4af37; }
        .social-links-section {
          margin-top: 40px; padding-top: 30px;
          border-top: 1px solid rgba(212, 175, 55, 0.2);
        }
        .social-links-section h3 {
          font-family: 'Playfair Display', serif; font-size: 24px;
          color: #5E2900; margin-bottom: 20px;
        }
        .social-icons-row { display: flex; gap: 15px; }
        .social-icons-row a {
          display: flex; align-items: center; justify-content: center;
          width: 45px; height: 45px; background-color: #d4af37;
          color: #fff; border-radius: 50%; text-decoration: none;
          transition: all 0.3s ease;
        }
        .social-icons-row a:hover { background-color: #b8941f; transform: translateY(-3px); }
        .form-container {
          background-color: #fff; border-radius: 12px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.1);
          padding: 50px 40px; position: relative; overflow: hidden;
        }
        .form-container::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 4px; background: linear-gradient(90deg, #d4af37, #b8941f);
        }
        .form-container h2 {
          font-family: 'Playfair Display', serif; font-size: 36px;
          color: #5E2900; margin-bottom: 30px; text-align: center;
        }
        .form-group { margin-bottom: 25px; }
        .form-group label {
          display: block; font-family: 'Poppins', sans-serif;
          font-size: 14px; font-weight: 500; color: #444;
          margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .form-group input, .form-group textarea, .form-group select {
          width: 100%; padding: 15px 20px; border: 2px solid #e8e8e8;
          border-radius: 8px; font-family: 'Poppins', sans-serif;
          font-size: 16px; color: #444; transition: all 0.3s ease;
          background-color: #fafafa; box-sizing: border-box;
        }
        .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
          outline: none; border-color: #d4af37; background-color: #fff;
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
        }
        .form-group textarea { resize: vertical; min-height: 120px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .contact-submit-btn {
          width: 100%; padding: 18px 30px;
          background: linear-gradient(135deg, #d4af37 0%, #b8941f 100%);
          color: #fff; border: none; border-radius: 8px;
          font-family: 'Poppins', sans-serif; font-size: 16px;
          font-weight: 600; text-transform: uppercase; letter-spacing: 1px;
          cursor: pointer; transition: all 0.3s ease; margin-top: 20px;
        }
        .contact-submit-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(212, 175, 55, 0.3); }
        .contact-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .contact-status-msg {
          padding: 15px 20px; border-radius: 8px; margin-bottom: 20px;
          font-family: 'Poppins', sans-serif; font-weight: 500;
        }
        .contact-status-msg.success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .contact-status-msg.error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .working-hours {
          background-color: #5E2900; color: #fff; padding: 60px 0; text-align: center;
        }
        .working-hours h2 {
          font-family: 'Playfair Display', serif; font-size: 36px;
          color: #d4af37; margin-bottom: 30px;
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
          font-family: 'Poppins', sans-serif; font-size: 18px;
          font-weight: 600; margin-bottom: 10px; color: #d4af37;
        }
        .hours-item p { font-family: 'Poppins', sans-serif; font-size: 16px; margin: 0; }
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
      `}),e.jsx("section",{className:"contact-hero",children:e.jsx("div",{className:"container",children:e.jsxs("div",{className:"contact-hero-content",children:[e.jsx("h1",{children:"Contact Us"}),e.jsx("p",{children:"Reach out to us for any inquiries. We'd love to hear from you."})]})})}),e.jsx("section",{className:"contact-section",children:e.jsxs("div",{className:"contact-container",children:[e.jsxs("div",{className:"contact-info",children:[e.jsx("h2",{children:"Get in Touch"}),e.jsx("p",{children:"Have questions about our collections? We're here to help you discover what you're looking for."}),e.jsxs("ul",{className:"contact-details",children:[i&&e.jsxs("li",{children:[e.jsx("i",{className:"fas fa-map-marker-alt"}),e.jsx("span",{children:i})]}),s&&e.jsxs("li",{children:[e.jsx("i",{className:"fas fa-phone"}),e.jsx("a",{href:`tel:${s}`,children:s})]}),c&&e.jsxs("li",{children:[e.jsx("i",{className:"fas fa-envelope"}),e.jsx("a",{href:`mailto:${c}`,children:c})]}),s&&e.jsxs("li",{children:[e.jsx("i",{className:"fab fa-whatsapp"}),e.jsx("a",{href:`https://wa.me/${s.replace(/[^0-9]/g,"")}`,target:"_blank",rel:"noopener noreferrer",children:s})]})]}),(a.instagram||a.facebook||a.twitter||a.youtube)&&e.jsxs("div",{className:"social-links-section",children:[e.jsx("h3",{children:"Follow Us"}),e.jsxs("div",{className:"social-icons-row",children:[a.facebook&&e.jsx("a",{href:a.facebook,target:"_blank",rel:"noopener noreferrer",children:e.jsx("i",{className:"fab fa-facebook-f"})}),a.instagram&&e.jsx("a",{href:a.instagram,target:"_blank",rel:"noopener noreferrer",children:e.jsx("i",{className:"fab fa-instagram"})}),a.twitter&&e.jsx("a",{href:a.twitter,target:"_blank",rel:"noopener noreferrer",children:e.jsx("i",{className:"fab fa-twitter"})}),a.youtube&&e.jsx("a",{href:a.youtube,target:"_blank",rel:"noopener noreferrer",children:e.jsx("i",{className:"fab fa-youtube"})})]})]})]}),e.jsxs("div",{className:"form-container",children:[e.jsx("h2",{children:"Send Us a Message"}),l==="success"&&e.jsxs("div",{className:"contact-status-msg success",children:[e.jsx("i",{className:"fas fa-check-circle"})," Your message has been sent successfully!"]}),l==="error"&&e.jsxs("div",{className:"contact-status-msg error",children:[e.jsx("i",{className:"fas fa-exclamation-circle"})," Something went wrong. Please try again."]}),e.jsxs("form",{onSubmit:m,children:[e.jsxs("div",{className:"form-row",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Full Name *"}),e.jsx("input",{type:"text",name:"name",value:t.name,onChange:r,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Email Address *"}),e.jsx("input",{type:"email",name:"email",value:t.email,onChange:r,required:!0})]})]}),e.jsxs("div",{className:"form-row",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",name:"phone",value:t.phone,onChange:r})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Subject *"}),e.jsx("input",{type:"text",name:"subject",value:t.subject,onChange:r,required:!0})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Message *"}),e.jsx("textarea",{name:"message",value:t.message,onChange:r,required:!0,placeholder:"How can we help you?"})]}),e.jsx("button",{type:"submit",className:"contact-submit-btn",disabled:d,children:d?"Sending...":"Send Message"})]})]})]})}),e.jsxs("section",{className:"working-hours",children:[e.jsx("h2",{children:"Working Hours"}),e.jsxs("div",{className:"hours-grid",children:[e.jsxs("div",{className:"hours-item",children:[e.jsx("h3",{children:"Monday - Saturday"}),e.jsx("p",{children:"10:00 AM - 7:00 PM"})]}),e.jsxs("div",{className:"hours-item",children:[e.jsx("h3",{children:"Sunday"}),e.jsx("p",{children:"11:00 AM - 6:00 PM"})]})]})]})]})}function N({siteConfig:o,brandName:n,phone:s,email:c,address:i,socialLinks:a,form:t,status:l,submitting:d,handleChange:r,handleSubmit:m}){return e.jsxs("div",{children:[e.jsxs("section",{className:"mn-contact-hero",children:[e.jsx("h1",{children:"Contact Us"}),e.jsx("p",{children:"Reach out to us for any inquiries. We'd love to hear from you."})]}),e.jsx("section",{className:"mn-contact-section",children:e.jsxs("div",{className:"mn-contact-container",children:[e.jsxs("div",{className:"mn-contact-info",children:[e.jsx("h2",{children:"Get in Touch"}),e.jsx("p",{children:"Have questions about our collections? We're here to help you discover what you're looking for."}),e.jsxs("ul",{className:"mn-contact-details",children:[i&&e.jsxs("li",{children:[e.jsx("i",{className:"fas fa-map-marker-alt"}),e.jsx("span",{children:i})]}),s&&e.jsxs("li",{children:[e.jsx("i",{className:"fas fa-phone"}),e.jsx("a",{href:`tel:${s}`,children:s})]}),c&&e.jsxs("li",{children:[e.jsx("i",{className:"fas fa-envelope"}),e.jsx("a",{href:`mailto:${c}`,children:c})]}),s&&e.jsxs("li",{children:[e.jsx("i",{className:"fab fa-whatsapp"}),e.jsx("a",{href:`https://wa.me/${s.replace(/[^0-9]/g,"")}`,target:"_blank",rel:"noopener noreferrer",children:s})]})]}),(a.instagram||a.facebook||a.twitter||a.youtube)&&e.jsxs("div",{className:"mn-contact-social",children:[e.jsx("h3",{children:"Follow Us"}),e.jsxs("div",{className:"mn-contact-social-icons",children:[a.facebook&&e.jsx("a",{href:a.facebook,target:"_blank",rel:"noopener noreferrer",children:e.jsx("i",{className:"fab fa-facebook-f"})}),a.instagram&&e.jsx("a",{href:a.instagram,target:"_blank",rel:"noopener noreferrer",children:e.jsx("i",{className:"fab fa-instagram"})}),a.twitter&&e.jsx("a",{href:a.twitter,target:"_blank",rel:"noopener noreferrer",children:e.jsx("i",{className:"fab fa-twitter"})}),a.youtube&&e.jsx("a",{href:a.youtube,target:"_blank",rel:"noopener noreferrer",children:e.jsx("i",{className:"fab fa-youtube"})})]})]})]}),e.jsxs("div",{className:"mn-contact-form",children:[e.jsx("h2",{children:"Send Us a Message"}),l==="success"&&e.jsxs("div",{className:"mn-contact-status success",children:[e.jsx("i",{className:"fas fa-check-circle"})," Your message has been sent successfully!"]}),l==="error"&&e.jsxs("div",{className:"mn-contact-status error",children:[e.jsx("i",{className:"fas fa-exclamation-circle"})," Something went wrong. Please try again."]}),e.jsxs("form",{onSubmit:m,children:[e.jsxs("div",{className:"mn-form-row",children:[e.jsxs("div",{className:"mn-form-group",children:[e.jsx("label",{children:"Full Name *"}),e.jsx("input",{type:"text",name:"name",value:t.name,onChange:r,required:!0})]}),e.jsxs("div",{className:"mn-form-group",children:[e.jsx("label",{children:"Email Address *"}),e.jsx("input",{type:"email",name:"email",value:t.email,onChange:r,required:!0})]})]}),e.jsxs("div",{className:"mn-form-row",children:[e.jsxs("div",{className:"mn-form-group",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",name:"phone",value:t.phone,onChange:r})]}),e.jsxs("div",{className:"mn-form-group",children:[e.jsx("label",{children:"Subject *"}),e.jsx("input",{type:"text",name:"subject",value:t.subject,onChange:r,required:!0})]})]}),e.jsxs("div",{className:"mn-form-group",children:[e.jsx("label",{children:"Message *"}),e.jsx("textarea",{name:"message",value:t.message,onChange:r,required:!0,placeholder:"How can we help you?"})]}),e.jsx("button",{type:"submit",className:"mn-contact-submit",disabled:d,children:d?"Sending...":"Send Message"})]})]})]})}),e.jsxs("section",{className:"mn-working-hours",children:[e.jsx("h2",{children:"Working Hours"}),e.jsxs("div",{className:"mn-hours-grid",children:[e.jsxs("div",{className:"mn-hours-item",children:[e.jsx("h3",{children:"Monday - Saturday"}),e.jsx("p",{children:"10:00 AM - 7:00 PM"})]}),e.jsxs("div",{className:"mn-hours-item",children:[e.jsx("h3",{children:"Sunday"}),e.jsx("p",{children:"11:00 AM - 6:00 PM"})]})]})]})]})}function k(){const{siteConfig:o}=h(),{isModern:n}=u();b({title:"Contact Us",pageType:"contact"});const s=o?.brandName||"Our Store",c=o?.phone||"",i=o?.email||"",a=o?.address||"",t=o?.socialLinks||{},{form:l,status:d,submitting:r,handleChange:m,handleSubmit:f}=j(o),x={siteConfig:o,brandName:s,phone:c,email:i,address:a,socialLinks:t,form:l,status:d,submitting:r,handleChange:m,handleSubmit:f};return n?e.jsx(N,{...x}):e.jsx(y,{...x})}export{k as default};
