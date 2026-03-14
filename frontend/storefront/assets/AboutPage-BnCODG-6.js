import{u as x,a as v,j as e}from"./index-CzHOaunF.js";const w={jewellery:{heroSubtitle:"Discover our story, heritage, and the passion behind every exquisite piece we create",storyText:`Welcome to {brandName}. We are dedicated to bringing you the finest jewellery with unmatched quality and craftsmanship that speaks for itself.

Our commitment to authentic craftsmanship and traditional artistry has made us one of the most trusted names in the jewellery industry. Every piece in our collection reflects expertise, artistic brilliance, and timeless beauty.

We believe in creating experiences, not just jewellery. Each item is carefully curated and crafted to perfection for discerning customers worldwide.`,sections:[{heading:"Our Mission",text:`{brandName} is more than just a brand – it is a commitment to excellence, quality, and customer satisfaction that drives everything we do.

We aim to preserve and promote the finest traditions of craftsmanship, creating masterpieces that blend timeless elegance with contemporary appeal.

Our commitment extends beyond creating beautiful products – we are dedicated to supporting artisans, preserving techniques, and ensuring that this heritage continues to shine for generations to come.`,visible:!0}]},clothing:{heroSubtitle:"Discover our story and the passion behind every collection we design",storyText:`Welcome to {brandName}. We are passionate about fashion and dedicated to bringing you stylish, high-quality clothing for every occasion.

Our team of designers draws inspiration from global trends while staying true to timeless style. Every garment in our collection is thoughtfully designed and crafted with attention to detail.

We believe fashion should be accessible, comfortable, and expressive. That's why we create versatile pieces that help you look and feel your best.`,sections:[{heading:"Our Mission",text:`{brandName} is more than just a clothing brand – it is about empowering you to express yourself through style.

We aim to make fashion accessible and sustainable, creating collections that are as kind to the planet as they are to your wardrobe.

Our commitment goes beyond great clothing – we are building a community of fashion lovers who believe in quality, creativity, and individuality.`,visible:!0}]},electronics:{heroSubtitle:"Innovation, quality, and technology at the heart of everything we do",storyText:`Welcome to {brandName}. We are dedicated to bringing you the latest in technology with products that combine innovation, quality, and value.

Our team of tech enthusiasts carefully selects every product in our catalogue, ensuring it meets the highest standards of performance and reliability.

We believe technology should enhance your life. That's why we offer products that are not just cutting-edge, but also user-friendly and built to last.`,sections:[{heading:"Our Mission",text:`{brandName} is your trusted destination for quality technology products.

We aim to make the latest technology accessible to everyone, offering genuine products at competitive prices with exceptional service.

Our commitment is to be more than a store – we want to be your go-to tech partner, helping you find the perfect products for your needs.`,visible:!0}]}},j={heroSubtitle:"Discover our story, heritage, and the passion behind every product we offer",storyText:`Welcome to {brandName}. We are dedicated to bringing you the finest products with unmatched quality and service that speaks for itself.

Our commitment to excellence and attention to detail has made us one of the most trusted names in our industry. Every product in our collection reflects expertise, quality, and care.

We believe in creating experiences, not just selling products. Each item is carefully curated and selected to perfection for discerning customers worldwide.`,sections:[{heading:"Our Mission",text:`{brandName} is more than just a brand – it is a commitment to excellence, quality, and customer satisfaction that drives everything we do.

We aim to deliver the finest products, creating an experience that blends quality with exceptional service.

Our commitment extends beyond selling products – we are dedicated to building lasting relationships with our customers and ensuring satisfaction for generations to come.`,visible:!0}]};function N(i,a){const r=w[i]||j,n=a;return{heroSubtitle:r.heroSubtitle,storyText:r.storyText.replace(/\{brandName\}/g,n),storyImage:"",sections:r.sections.map(t=>({heading:t.heading,text:t.text.replace(/\{brandName\}/g,n),visible:t.visible}))}}function O(){const{siteConfig:i}=x(),a=i?.brandName||i?.name||"Our Store",r=i?.category||"";let n=i?.settings||{};if(typeof n=="string")try{n=JSON.parse(n)}catch{n={}}const t=n.aboutPage||{},o=N(r,a),m=t.heroSubtitle||o.heroSubtitle,g=t.storyText||o.storyText,u=t.storyImage||o.storyImage;let c;t.sections&&t.sections.length>0?c=t.sections:t.missionHeading||t.missionText?c=[{heading:t.missionHeading||o.sections[0].heading,text:t.missionText||o.sections[0].text,visible:!0}]:c=o.sections;const y=c.filter(s=>s.visible!==!1),b=g.split(`

`).filter(s=>s.trim()),h=u?v(u):"";return e.jsxs("div",{className:"about-page",children:[e.jsxs("section",{className:"about-hero",children:[e.jsx("div",{className:"about-hero-overlay"}),e.jsxs("div",{className:"about-hero-inner",children:[e.jsx("span",{className:"about-hero-label",children:"Our Story"}),e.jsxs("h1",{children:["About ",a]}),e.jsx("p",{children:m}),e.jsx("div",{className:"about-hero-divider"})]})]}),e.jsx("section",{className:"about-story",children:e.jsxs("div",{className:"about-story-inner",children:[e.jsxs("div",{className:"about-story-image-wrap",children:[h?e.jsx("img",{src:h,alt:a,className:"about-story-img"}):i?.logoUrl?e.jsx("img",{src:i.logoUrl,alt:a,className:"about-story-img"}):e.jsx("div",{className:"about-story-placeholder",children:e.jsx("i",{className:"fas fa-store"})}),e.jsx("div",{className:"about-story-image-accent"})]}),e.jsx("div",{className:"about-story-text",children:b.map((s,l)=>e.jsx("p",{children:s},l))})]})}),y.map((s,l)=>{const p=(s.text||"").split(`

`).filter(d=>d.trim());return e.jsx("section",{className:"about-content-section",children:e.jsxs("div",{className:"about-content-section-inner",children:[e.jsx("span",{className:"about-content-section-eyebrow",children:s.heading}),e.jsx("h2",{children:s.heading}),e.jsx("div",{className:"about-content-section-divider"}),e.jsx("div",{className:"about-content-section-text",children:p.map((d,f)=>e.jsx("p",{children:d},f))})]})},l)})]})}export{O as default};
