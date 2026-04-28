export type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  badge?: 'NEW' | 'BESTSELLER' | 'LIMITED' | null;
  inStock: boolean;
  subcategory: string;
  hoverImage?: string;
};

export const CATEGORY = {
  name: 'Bridal Collection',
  description:
    'Heirloom pieces handcrafted for the most cherished moments — discover diamond, polki, and kundan creations forged in 22 karat gold.',
  heroImage:
    'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=1800&q=80',
  productCount: 48,
  breadcrumb: ['Home', 'Jewellery', 'Bridal Collection'],
};

export const SUBCATEGORIES = [
  { id: 'all',       name: 'All',                count: 48 },
  { id: 'necklaces', name: 'Necklaces',          count: 14 },
  { id: 'earrings',  name: 'Earrings',           count: 12 },
  { id: 'bangles',   name: 'Bangles & Bracelets',count: 9  },
  { id: 'rings',     name: 'Rings',              count: 8  },
  { id: 'sets',      name: 'Bridal Sets',        count: 5  },
];

export const PRODUCTS: Product[] = [
  { id: '1',  name: 'Aarambh Polki Necklace',          price: 248000, image: 'https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?auto=format&fit=crop&w=900&q=80',  badge: 'BESTSELLER', inStock: true,  subcategory: 'necklaces', hoverImage: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=900&q=80' },
  { id: '2',  name: 'Riti Diamond Choker',             price: 189000, image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80',  badge: 'NEW',        inStock: true,  subcategory: 'necklaces' },
  { id: '3',  name: 'Madhuri Jhumka Earrings',         price: 64500,  image: 'https://images.unsplash.com/photo-1631982690223-8aa4be0a2497?auto=format&fit=crop&w=900&q=80',  badge: null,         inStock: true,  subcategory: 'earrings' },
  { id: '4',  name: 'Kanak Kada Bangle',               price: 132000, image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=80',  badge: 'LIMITED',    inStock: true,  subcategory: 'bangles' },
  { id: '5',  name: 'Sunehri Solitaire Ring',          price: 295000, image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=80',  badge: null,         inStock: false, subcategory: 'rings' },
  { id: '6',  name: 'Vrinda Temple Set',               price: 412000, image: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?auto=format&fit=crop&w=900&q=80',  badge: 'BESTSELLER', inStock: true,  subcategory: 'sets' },
  { id: '7',  name: 'Anusha Maang Tikka',              price: 38900,  image: 'https://images.unsplash.com/photo-1616697604969-a93810cc5b34?auto=format&fit=crop&w=900&q=80',  badge: null,         inStock: true,  subcategory: 'sets' },
  { id: '8',  name: 'Lavanya Chand Bali',              price: 52400,  image: 'https://images.unsplash.com/photo-1620656798579-1984d9e87df7?auto=format&fit=crop&w=900&q=80',  badge: 'NEW',        inStock: true,  subcategory: 'earrings' },
  { id: '9',  name: 'Roshni Ruby Pendant',             price: 78600,  image: 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?auto=format&fit=crop&w=900&q=80',  badge: null,         inStock: true,  subcategory: 'necklaces' },
  { id: '10', name: 'Devika Emerald Bracelet',         price: 156000, image: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=900&q=80',  badge: 'LIMITED',    inStock: true,  subcategory: 'bangles' },
  { id: '11', name: 'Saanvi Stackable Ring',           price: 42500,  image: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=900&q=80',  badge: null,         inStock: true,  subcategory: 'rings' },
  { id: '12', name: 'Pari Pearl Drop Earrings',        price: 31200,  image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=80',  badge: 'BESTSELLER', inStock: true,  subcategory: 'earrings' },
];

export const formatINR = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
