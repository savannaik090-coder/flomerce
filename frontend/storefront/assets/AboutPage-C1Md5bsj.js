import{u as p,a as f,j as e}from"./index-CoJKTAjz.js";const x={jewellery:{heroSubtitle:"Discover our story, heritage, and the passion behind every exquisite piece we create",storyHeading:"Our Heritage",storyText:`Welcome to {brandName}. We are dedicated to bringing you the finest jewellery with unmatched quality and craftsmanship that speaks for itself.

Our commitment to authentic craftsmanship and traditional artistry has made us one of the most trusted names in the jewellery industry. Every piece in our collection reflects expertise, artistic brilliance, and timeless beauty.

We believe in creating experiences, not just jewellery. Each item is carefully curated and crafted to perfection for discerning customers worldwide.`,missionHeading:"Our Mission",missionText:`{brandName} is more than just a brand – it is a commitment to excellence, quality, and customer satisfaction that drives everything we do.

We aim to preserve and promote the finest traditions of craftsmanship, creating masterpieces that blend timeless elegance with contemporary appeal.

Our commitment extends beyond creating beautiful products – we are dedicated to supporting artisans, preserving techniques, and ensuring that this heritage continues to shine for generations to come.`},clothing:{heroSubtitle:"Discover our story and the passion behind every collection we design",storyHeading:"Our Story",storyText:`Welcome to {brandName}. We are passionate about fashion and dedicated to bringing you stylish, high-quality clothing for every occasion.

Our team of designers draws inspiration from global trends while staying true to timeless style. Every garment in our collection is thoughtfully designed and crafted with attention to detail.

We believe fashion should be accessible, comfortable, and expressive. That's why we create versatile pieces that help you look and feel your best.`,missionHeading:"Our Mission",missionText:`{brandName} is more than just a clothing brand – it is about empowering you to express yourself through style.

We aim to make fashion accessible and sustainable, creating collections that are as kind to the planet as they are to your wardrobe.

Our commitment goes beyond great clothing – we are building a community of fashion lovers who believe in quality, creativity, and individuality.`},electronics:{heroSubtitle:"Innovation, quality, and technology at the heart of everything we do",storyHeading:"Our Story",storyText:`Welcome to {brandName}. We are dedicated to bringing you the latest in technology with products that combine innovation, quality, and value.

Our team of tech enthusiasts carefully selects every product in our catalogue, ensuring it meets the highest standards of performance and reliability.

We believe technology should enhance your life. That's why we offer products that are not just cutting-edge, but also user-friendly and built to last.`,missionHeading:"Our Mission",missionText:`{brandName} is your trusted destination for quality technology products.

We aim to make the latest technology accessible to everyone, offering genuine products at competitive prices with exceptional service.

Our commitment is to be more than a store – we want to be your go-to tech partner, helping you find the perfect products for your needs.`}},v={heroSubtitle:"Discover our story, heritage, and the passion behind every product we offer",storyHeading:"Our Story",storyText:`Welcome to {brandName}. We are dedicated to bringing you the finest products with unmatched quality and service that speaks for itself.

Our commitment to excellence and attention to detail has made us one of the most trusted names in our industry. Every product in our collection reflects expertise, quality, and care.

We believe in creating experiences, not just selling products. Each item is carefully curated and selected to perfection for discerning customers worldwide.`,missionHeading:"Our Mission",missionText:`{brandName} is more than just a brand – it is a commitment to excellence, quality, and customer satisfaction that drives everything we do.

We aim to deliver the finest products, creating an experience that blends quality with exceptional service.

Our commitment extends beyond selling products – we are dedicated to building lasting relationships with our customers and ensuring satisfaction for generations to come.`};function j(t,a){const o=x[t]||v,s=a;return{heroSubtitle:o.heroSubtitle,storyHeading:o.storyHeading,storyText:o.storyText.replace(/\{brandName\}/g,s),storyImage:"",missionHeading:o.missionHeading,missionText:o.missionText.replace(/\{brandName\}/g,s)}}function N(){const{siteConfig:t}=p(),a=t?.brandName||t?.name||"Our Store",o=t?.category||"";let s=t?.settings||{};if(typeof s=="string")try{s=JSON.parse(s)}catch{s={}}const n=s.aboutPage||{},r=j(o,a),m=n.heroSubtitle||r.heroSubtitle;n.storyHeading||r.storyHeading;const h=n.storyText||r.storyText,l=n.storyImage||r.storyImage,d=n.missionHeading||r.missionHeading,y=n.missionText||r.missionText,g=h.split(`

`).filter(i=>i.trim()),b=y.split(`

`).filter(i=>i.trim()),u=l?f(l):"";return e.jsxs("div",{className:"about-page",children:[e.jsxs("section",{className:"about-hero",children:[e.jsx("div",{className:"about-hero-overlay"}),e.jsxs("div",{className:"about-hero-inner",children:[e.jsx("span",{className:"about-hero-label",children:"Our Story"}),e.jsxs("h1",{children:["About ",a]}),e.jsx("p",{children:m}),e.jsx("div",{className:"about-hero-divider"})]})]}),e.jsx("section",{className:"about-story",children:e.jsxs("div",{className:"about-story-inner",children:[e.jsxs("div",{className:"about-story-image-wrap",children:[u?e.jsx("img",{src:u,alt:a,className:"about-story-img"}):t?.logoUrl?e.jsx("img",{src:t.logoUrl,alt:a,className:"about-story-img"}):e.jsx("div",{className:"about-story-placeholder",children:e.jsx("i",{className:"fas fa-store"})}),e.jsx("div",{className:"about-story-image-accent"})]}),e.jsxs("div",{className:"about-story-text",children:[e.jsx("h2",{children:a}),e.jsx("div",{className:"about-story-divider"}),g.map((i,c)=>e.jsx("p",{children:i},c))]})]})}),e.jsxs("section",{className:"about-mission",children:[e.jsx("div",{className:"about-mission-bg"}),e.jsxs("div",{className:"about-mission-inner",children:[e.jsx("span",{className:"about-mission-eyebrow",children:d}),e.jsx("h2",{children:d}),e.jsx("div",{className:"about-mission-divider"}),e.jsx("div",{className:"about-mission-text",children:b.map((i,c)=>e.jsx("p",{children:i},c))})]})]})]})}export{N as default};
