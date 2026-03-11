import{u as b,a as x,j as e}from"./index-D2J26iu7.js";const v={jewellery:{heroSubtitle:"Discover our story, heritage, and the passion behind every exquisite piece we create",storyHeading:"Our Heritage",storyText:`Welcome to {brandName}. We are dedicated to bringing you the finest jewellery with unmatched quality and craftsmanship that speaks for itself.

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

Our commitment is to be more than a store – we want to be your go-to tech partner, helping you find the perfect products for your needs.`}},w={heroSubtitle:"Discover our story, heritage, and the passion behind every product we offer",storyHeading:"Our Story",storyText:`Welcome to {brandName}. We are dedicated to bringing you the finest products with unmatched quality and service that speaks for itself.

Our commitment to excellence and attention to detail has made us one of the most trusted names in our industry. Every product in our collection reflects expertise, quality, and care.

We believe in creating experiences, not just selling products. Each item is carefully curated and selected to perfection for discerning customers worldwide.`,missionHeading:"Our Mission",missionText:`{brandName} is more than just a brand – it is a commitment to excellence, quality, and customer satisfaction that drives everything we do.

We aim to deliver the finest products, creating an experience that blends quality with exceptional service.

Our commitment extends beyond selling products – we are dedicated to building lasting relationships with our customers and ensuring satisfaction for generations to come.`};function j(t,s){const o=v[t]||w,i=s;return{heroSubtitle:o.heroSubtitle,storyHeading:o.storyHeading,storyText:o.storyText.replace(/\{brandName\}/g,i),storyImage:"",missionHeading:o.missionHeading,missionText:o.missionText.replace(/\{brandName\}/g,i)}}function T(){const{siteConfig:t}=b(),s=t?.brandName||t?.name||"Our Store",o=t?.category||"";let i=t?.settings||{};if(typeof i=="string")try{i=JSON.parse(i)}catch{i={}}const a=i.aboutPage||{},r=j(o,s),u=a.heroSubtitle||r.heroSubtitle,m=a.storyHeading||r.storyHeading,h=a.storyText||r.storyText,d=a.storyImage||r.storyImage,g=a.missionHeading||r.missionHeading,y=a.missionText||r.missionText,f=h.split(`

`).filter(n=>n.trim()),p=y.split(`

`).filter(n=>n.trim()),l=d?x(d):"";return e.jsxs("div",{className:"about-page",children:[e.jsx("section",{className:"about-hero",children:e.jsx("div",{className:"container",children:e.jsxs("div",{className:"about-hero-content",children:[e.jsxs("h1",{children:["About ",s]}),e.jsx("p",{children:u})]})})}),e.jsx("section",{className:"founder-section",children:e.jsxs("div",{className:"founder-container",children:[e.jsx("div",{className:"founder-image",children:l?e.jsx("img",{src:l,alt:s}):t?.logoUrl?e.jsx("img",{src:t.logoUrl,alt:s}):e.jsx("div",{style:{width:"100%",maxWidth:450,height:400,borderRadius:8,background:"linear-gradient(135deg, #f9f5f0, #ede5d8)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",zIndex:2,fontSize:64,color:"#d4af37"},children:e.jsx("i",{className:"fas fa-store"})})}),e.jsxs("div",{className:"founder-content",children:[e.jsx("h2",{children:s}),e.jsx("div",{className:"title",children:m}),f.map((n,c)=>e.jsx("p",{children:n},c))]})]})}),e.jsx("section",{className:"mission-section",children:e.jsxs("div",{className:"mission-content",children:[e.jsx("h2",{children:g}),p.map((n,c)=>e.jsx("p",{children:n},c))]})})]})}export{T as default};
