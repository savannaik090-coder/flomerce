export type Product = {
  id: string;
  name: string;
  price: number;
  compare_price: number | null;
  images: string[];
  stock: number;
  is_featured: 0 | 1;
  tags: string[];
  subcategory_id: string;
  slug: string;
};

export type Subcategory = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  subtitle: string | null;
  image_url: string | null;
};

export const CATEGORY: Category = {
  id: 'cat_bridal',
  name: 'Bridal Collection',
  slug: 'bridal-collection',
  description:
    'Heirloom pieces handcrafted for the most cherished moments — diamond, polki, and kundan creations forged in 22 karat gold.',
  subtitle: 'Forged in 22 karat gold',
  image_url:
    'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=1800&q=80',
};

export const SUBCATEGORIES: Subcategory[] = [
  { id: 'sub_necklaces', name: 'Necklaces',           slug: 'necklaces', image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80' },
  { id: 'sub_earrings',  name: 'Earrings',            slug: 'earrings',  image_url: 'https://images.unsplash.com/photo-1631982690223-8aa4be0a2497?auto=format&fit=crop&w=600&q=80' },
  { id: 'sub_bangles',   name: 'Bangles & Bracelets', slug: 'bangles',   image_url: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=600&q=80' },
  { id: 'sub_rings',     name: 'Rings',               slug: 'rings',     image_url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80' },
  { id: 'sub_sets',      name: 'Bridal Sets',         slug: 'sets',      image_url: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?auto=format&fit=crop&w=600&q=80' },
];

export const PRODUCTS: Product[] = [
  { id: 'p1',  name: 'Aarambh Polki Necklace',    slug: 'aarambh-polki-necklace',    price: 248000, compare_price: null,   images: ['https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?auto=format&fit=crop&w=900&q=80'], stock: 3, is_featured: 1, tags: [], subcategory_id: 'sub_necklaces' },
  { id: 'p2',  name: 'Riti Diamond Choker',       slug: 'riti-diamond-choker',       price: 189000, compare_price: null,   images: ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80'], stock: 5, is_featured: 0, tags: [], subcategory_id: 'sub_necklaces' },
  { id: 'p3',  name: 'Madhuri Jhumka Earrings',   slug: 'madhuri-jhumka-earrings',   price:  64500, compare_price: null,   images: ['https://images.unsplash.com/photo-1631982690223-8aa4be0a2497?auto=format&fit=crop&w=900&q=80'], stock: 8, is_featured: 0, tags: [], subcategory_id: 'sub_earrings'  },
  { id: 'p4',  name: 'Kanak Kada Bangle',         slug: 'kanak-kada-bangle',         price: 132000, compare_price: null,   images: ['https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=80'], stock: 2, is_featured: 1, tags: [], subcategory_id: 'sub_bangles'   },
  { id: 'p5',  name: 'Sunehri Solitaire Ring',    slug: 'sunehri-solitaire-ring',    price: 295000, compare_price: null,   images: ['https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=80'], stock: 0, is_featured: 0, tags: [], subcategory_id: 'sub_rings'     },
  { id: 'p6',  name: 'Vrinda Temple Set',         slug: 'vrinda-temple-set',         price: 412000, compare_price: null,   images: ['https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?auto=format&fit=crop&w=900&q=80'], stock: 1, is_featured: 1, tags: [], subcategory_id: 'sub_sets'      },
  { id: 'p7',  name: 'Anusha Maang Tikka',        slug: 'anusha-maang-tikka',        price:  38900, compare_price: null,   images: ['https://images.unsplash.com/photo-1616697604969-a93810cc5b34?auto=format&fit=crop&w=900&q=80'], stock: 6, is_featured: 0, tags: [], subcategory_id: 'sub_sets'      },
  { id: 'p8',  name: 'Lavanya Chand Bali',        slug: 'lavanya-chand-bali',        price:  52400, compare_price: null,   images: ['https://images.unsplash.com/photo-1620656798579-1984d9e87df7?auto=format&fit=crop&w=900&q=80'], stock: 9, is_featured: 0, tags: [], subcategory_id: 'sub_earrings'  },
  { id: 'p9',  name: 'Roshni Ruby Pendant',       slug: 'roshni-ruby-pendant',       price:  78600, compare_price: null,   images: ['https://images.unsplash.com/photo-1602173574767-37ac01994b2a?auto=format&fit=crop&w=900&q=80'], stock: 4, is_featured: 0, tags: [], subcategory_id: 'sub_necklaces' },
  { id: 'p10', name: 'Devika Emerald Bracelet',   slug: 'devika-emerald-bracelet',   price: 156000, compare_price: null,   images: ['https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=900&q=80'], stock: 2, is_featured: 0, tags: [], subcategory_id: 'sub_bangles'   },
  { id: 'p11', name: 'Saanvi Stackable Ring',     slug: 'saanvi-stackable-ring',     price:  42500, compare_price: null,   images: ['https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=900&q=80'], stock: 7, is_featured: 0, tags: [], subcategory_id: 'sub_rings'     },
  { id: 'p12', name: 'Pari Pearl Drop Earrings',  slug: 'pari-pearl-drop-earrings',  price:  31200, compare_price: null,   images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=80'], stock: 12, is_featured: 1, tags: [], subcategory_id: 'sub_earrings' },
];

export const formatINR = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
