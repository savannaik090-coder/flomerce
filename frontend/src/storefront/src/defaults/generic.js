export const policies = {
  shippingRegions: 'We ship across India and select international destinations',
  shippingCharges: 'Free shipping on orders above ₹1,500. Standard shipping charges apply for smaller orders',
  shippingDeliveryTime: '5-7 business days for standard delivery. Express delivery available in select cities',
  shippingTracking: 'Real-time tracking updates via SMS and email after dispatch',
  returnPolicy: '7-day return policy for unused items in original packaging with tags intact',
  returnReplacements: 'Replacements available for damaged or defective products within 48 hours of delivery',
  returnMandatory: 'Original packaging, invoice, and product tags must be intact for all returns',
  careGuideWashing: 'Follow the specific care instructions provided with your product',
  careGuideCleaning: 'Clean gently with appropriate materials as recommended for the product type',
  careGuideMaintenance: 'Store in a cool, dry place away from direct sunlight and moisture',
};

export const policyPlaceholders = {
  shippingRegions: 'e.g., Pan-India and international delivery',
  shippingCharges: 'e.g., Free above ₹1,500, standard charges below',
  shippingDeliveryTime: 'e.g., 5-7 business days standard delivery',
  shippingTracking: 'e.g., SMS and email tracking after dispatch',
  returnPolicy: 'e.g., 7-day return for unused items',
  returnReplacements: 'e.g., Replacements for defective items',
  returnMandatory: 'e.g., Original packaging and invoice required',
  careGuideCleaning: 'e.g., Clean gently with soft cloth',
  careGuideWashing: 'e.g., Follow product care instructions',
  careGuideMaintenance: 'e.g., Store in cool, dry place',
};

export const aboutPage = {
  heroSubtitle: 'Discover our story, heritage, and the passion behind every product we offer',
  storyText: 'Welcome to {brandName}. We are dedicated to bringing you the finest products with unmatched quality and service that speaks for itself.\n\nOur commitment to excellence and attention to detail has made us one of the most trusted names in our industry. Every product in our collection reflects expertise, quality, and care.\n\nWe believe in creating experiences, not just selling products. Each item is carefully curated and selected to perfection for discerning customers worldwide.',
  sections: [
    { heading: 'Our Mission', text: '{brandName} is more than just a brand – it is a commitment to excellence, quality, and customer satisfaction that drives everything we do.\n\nWe aim to deliver the finest products, creating an experience that blends quality with exceptional service.\n\nOur commitment extends beyond selling products – we are dedicated to building lasting relationships with our customers and ensuring satisfaction for generations to come.', visible: true },
  ],
};

export const featuredVideo = {
  title: "Discover Our Collection",
  description: "Explore our curated selection of premium products. Connect with us and find exactly what you're looking for",
};

export const featuredVideoPlaceholders = {
  title: "e.g., Discover Our Collection",
  description: "e.g., Explore our curated selection of premium products. Connect with us and find exactly what you're looking for",
};

export const watchAndBuyDefaults = [
  { id: 'default-1', title: 'Best Seller', productSku: '', videoUrl: '' },
  { id: 'default-2', title: 'New Arrival', productSku: '', videoUrl: '' },
  { id: 'default-3', title: 'Trending Now', productSku: '', videoUrl: '' },
  { id: 'default-4', title: 'Customer Favourite', productSku: '', videoUrl: '' },
  { id: 'default-5', title: 'Limited Edition', productSku: '', videoUrl: '' },
  { id: 'default-6', title: 'Staff Pick', productSku: '', videoUrl: '' },
];

export const termsIntro = "Please read these Terms and Conditions carefully before using {brand}'s website and services. By accessing or using our service, you agree to be bound by these terms.";

export const termsSections = [
  {
    title: '1. Acceptance of Terms',
    content: 'By accessing and placing an order with {brand}, you confirm that you are in agreement with and bound by these Terms and Conditions. These terms apply to the entire website and any email or other type of communication between you and {brand}.',
  },
  {
    title: '2. Products and Pricing',
    content: 'All products are subject to availability. We reserve the right to discontinue any product at any time.\nPrices are listed in Indian Rupees (INR) and are subject to change without notice.\nWe make every effort to display accurate product descriptions and images, but we do not warrant that product descriptions are accurate, complete, or current.',
  },
  {
    title: '3. Orders and Payment',
    content: 'By placing an order, you offer to purchase a product subject to these terms. We reserve the right to refuse or cancel any order at our discretion.\nPayment must be received before orders are processed. We accept payments via Razorpay (credit/debit cards, UPI, net banking) and Cash on Delivery (where available).',
  },
  {
    title: '4. Shipping and Delivery',
    content: 'Delivery times are estimates only and may vary. We are not responsible for delays caused by courier services or unforeseen circumstances.\nRisk of loss and title pass to you upon delivery to the carrier. We are not liable for any loss, theft, or damage during transit.',
  },
  {
    title: '5. Returns and Refunds',
    content: 'We want you to be completely satisfied with your purchase. If you are not satisfied, you may return eligible items within 7 days of delivery.\nItems must be unused, in original packaging, and accompanied by the original receipt.\nRefunds will be processed within 5-7 business days after we receive and inspect the returned item.\nCustom or personalized items may not be eligible for return.',
  },
  {
    title: '6. Intellectual Property',
    content: 'All content on this website, including text, graphics, logos, images, and software, is the property of {brand} and is protected by applicable intellectual property laws.\nYou may not reproduce, distribute, or create derivative works without our express written permission.',
  },
  {
    title: '7. User Accounts',
    content: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Please notify us immediately of any unauthorized use of your account.',
  },
  {
    title: '8. Limitation of Liability',
    content: 'To the fullest extent permitted by law, {brand} shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services or products.\nOur total liability shall not exceed the amount paid by you for the specific product giving rise to the claim.',
  },
  {
    title: '9. Governing Law',
    content: 'These Terms shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in the location of our registered office.',
  },
  {
    title: '10. Contact Information',
    content: 'For any questions regarding these Terms and Conditions, please contact us at {email}{phoneClause}.',
  },
];

export const privacyIntro = 'We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and share information about you when you use our services.';

export const privacySections = [
  {
    title: '1. Information We Collect',
    content: 'We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us for support. This includes:\n\u2022 Name, email address, and phone number\n\u2022 Billing and shipping address\n\u2022 Payment information (processed securely via Razorpay \u2014 we do not store card details)\n\u2022 Order history and preferences\n\u2022 Device and usage information when you visit our website',
  },
  {
    title: '2. How We Use Your Information',
    content: 'We use the information we collect to:\n\u2022 Process and fulfill your orders\n\u2022 Send order confirmations and updates\n\u2022 Respond to your comments, questions, and requests\n\u2022 Send promotional communications (you can opt out at any time)\n\u2022 Improve our products and services\n\u2022 Comply with legal obligations',
  },
  {
    title: '3. Sharing of Information',
    content: 'We do not sell, trade, or rent your personal information to third parties. We may share your information with:\n\u2022 Payment processors (Razorpay) to complete transactions\n\u2022 Shipping partners to deliver your orders\n\u2022 Service providers who assist in our operations\n\u2022 Law enforcement when required by law',
  },
  {
    title: '4. Data Security',
    content: 'We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. All payment transactions are encrypted using SSL technology.',
  },
  {
    title: '5. Cookies',
    content: 'We use cookies and similar tracking technologies to enhance your experience on our website. You can control cookies through your browser settings. Disabling cookies may affect some features of our website.',
  },
  {
    title: '6. Your Rights',
    content: 'You have the right to:\n\u2022 Access the personal information we hold about you\n\u2022 Correct inaccurate or incomplete information\n\u2022 Request deletion of your personal information\n\u2022 Opt out of marketing communications\n\u2022 Lodge a complaint with a supervisory authority',
  },
  {
    title: "7. Children's Privacy",
    content: 'Our services are not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13.',
  },
  {
    title: '8. Changes to This Policy',
    content: 'We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.',
  },
  {
    title: '9. Contact Us',
    content: 'If you have any questions about this Privacy Policy, please contact us at {email}{phoneClause}.',
  },
];

export const defaultReviews = [
  { text: '"Excellent product quality and exactly as described. Very happy with my purchase!"', rating: 5, image: 'https://placehold.co/400x400/f0f4ff/5b6abf?text=Happy+Customer' },
  { text: '"Fast delivery and great packaging. The product exceeded my expectations"', rating: 5, image: 'https://placehold.co/400x400/f0fdf4/6b8e5a?text=Fast+Delivery' },
  { text: '"Amazing customer service and wonderful products. Will definitely order again!"', rating: 5, image: 'https://placehold.co/400x400/fef3c7/b8860b?text=Great+Service' },
  { text: '"Great value for money. The quality is outstanding and delivery was on time"', rating: 5, image: 'https://placehold.co/400x400/fdf2f8/c084a0?text=Great+Value' },
  { text: '"Loved everything about this order. From ordering to delivery, experience was smooth"', rating: 5, image: 'https://placehold.co/400x400/fff5f5/d4746a?text=Loved+It' },
];

export const orderActionNotes = {
  returnRefund: 'Your return request has been approved. If any payment was made, the refund will be processed within 5\u20137 business days. Please pack the product securely \u2014 our delivery partner will contact you for pickup within 8\u201312 days.',
  returnReplacement: 'Your return request has been approved for a replacement. Please pack the product securely \u2014 our delivery partner will contact you within 8\u201312 days to pick up the old product and deliver the replacement at the same time.',
  cancellationApproval: 'Your cancellation request has been approved. If any payment was made, the refund will be processed within 5\u20137 business days.',
};
