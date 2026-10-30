// GENERATED from app.spec.yaml by the pipeline. Do not edit; change the spec and regenerate.
export const app = {
  "name": "Bozor",
  "slug": "bozor-market",
  "description": "Thousands of products from local sellers, delivered to your door.",
  "type": "marketplace",
  "style": "market",
  "color": "violet",
  "appId": "uz.bozor.market",
  "currency": "UZS",
  "languages": [
    "uz",
    "ru",
    "en"
  ],
  "publicProfiles": false,
  "publicSite": true
}

export const entities = [
  {
    "name": "product",
    "label": "Product",
    "plural": "Products",
    "slug": "products",
    "icon": "i-lucide-package",
    "title": "name",
    "fields": [
      {
        "name": "name",
        "type": "text",
        "required": true,
        "unique": false,
        "max": 200,
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "label": "Name",
        "list": true,
        "search": true
      },
      {
        "name": "price",
        "type": "money",
        "required": true,
        "unique": false,
        "min": 0,
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "label": "Price",
        "list": true,
        "search": false
      },
      {
        "name": "old_price",
        "type": "money",
        "label": "Price before discount",
        "required": false,
        "unique": false,
        "min": 0,
        "list": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "search": false
      },
      {
        "name": "category",
        "type": "enum",
        "required": true,
        "unique": false,
        "default": "home",
        "options": [
          "electronics",
          "clothing",
          "shoes",
          "home",
          "beauty",
          "kids",
          "food",
          "books",
          "sports"
        ],
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "label": "Category",
        "list": true,
        "search": false
      },
      {
        "name": "brand",
        "type": "text",
        "required": false,
        "unique": false,
        "max": 120,
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "label": "Brand",
        "list": true,
        "search": true
      },
      {
        "name": "description",
        "type": "longtext",
        "required": false,
        "unique": false,
        "max": 10000,
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "label": "Description",
        "list": false,
        "search": false
      },
      {
        "name": "stock",
        "type": "integer",
        "required": true,
        "unique": false,
        "default": 0,
        "min": 0,
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "label": "Stock",
        "list": true,
        "search": false
      },
      {
        "name": "active",
        "type": "boolean",
        "label": "On sale",
        "required": false,
        "unique": false,
        "default": true,
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "list": true,
        "search": false
      },
      {
        "name": "tags",
        "type": "tags",
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "label": "Tags",
        "list": true,
        "search": false
      },
      {
        "required": false,
        "unique": false,
        "list": false,
        "staff": true,
        "readonly": false,
        "auto": true,
        "translate": false,
        "name": "cover_url",
        "type": "url",
        "label": "Cover image",
        "search": false
      }
    ],
    "builtIn": false,
    "permissions": {
      "read": "viewer",
      "create": "member",
      "update": "member",
      "delete": "admin"
    },
    "access": "public",
    "own": [],
    "customerCan": [],
    "publicRead": false,
    "createdByFunction": false,
    "attachments": true,
    "realtime": true,
    "sort": {
      "field": "created_at",
      "dir": "desc"
    },
    "nav": true,
    "children": [
      {
        "entity": "review",
        "field": "product_id"
      },
      {
        "entity": "question",
        "field": "product_id"
      },
      {
        "entity": "shop_variant",
        "field": "product_id"
      },
      {
        "entity": "shop_order_item",
        "field": "product_id"
      }
    ]
  },
  {
    "name": "review",
    "label": "Review",
    "plural": "Reviews",
    "slug": "reviews",
    "icon": "i-lucide-star",
    "title": "product_id",
    "fields": [
      {
        "name": "product_id",
        "type": "relation",
        "required": true,
        "unique": false,
        "to": "product",
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "label": "Product",
        "list": true,
        "search": false,
        "alias": "product",
        "fk": "review_product_id_fkey"
      },
      {
        "name": "rating",
        "type": "integer",
        "required": true,
        "unique": false,
        "min": 1,
        "max": 5,
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "label": "Rating",
        "list": true,
        "search": false
      },
      {
        "name": "comment",
        "type": "longtext",
        "required": true,
        "unique": false,
        "max": 2000,
        "list": true,
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "label": "Comment",
        "search": false
      }
    ],
    "builtIn": false,
    "permissions": {
      "read": "viewer",
      "create": "member",
      "update": "member",
      "delete": "admin"
    },
    "access": "customer",
    "own": [],
    "customerCan": [
      "update",
      "delete"
    ],
    "publicRead": true,
    "createdByFunction": false,
    "attachments": false,
    "realtime": true,
    "sort": {
      "field": "created_at",
      "dir": "desc"
    },
    "nav": true,
    "children": []
  },
  {
    "name": "question",
    "label": "Question",
    "plural": "Questions",
    "slug": "questions",
    "icon": "i-lucide-message-circle-question",
    "title": "product_id",
    "fields": [
      {
        "name": "product_id",
        "type": "relation",
        "required": true,
        "unique": false,
        "to": "product",
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "label": "Product",
        "list": true,
        "search": false,
        "alias": "product",
        "fk": "question_product_id_fkey"
      },
      {
        "name": "question",
        "type": "longtext",
        "required": true,
        "unique": false,
        "max": 1000,
        "list": true,
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "label": "Question",
        "search": false
      },
      {
        "name": "answer",
        "type": "longtext",
        "required": false,
        "unique": false,
        "max": 2000,
        "list": true,
        "staff": true,
        "readonly": false,
        "auto": false,
        "translate": false,
        "label": "Answer",
        "search": false
      }
    ],
    "builtIn": false,
    "permissions": {
      "read": "viewer",
      "create": "member",
      "update": "member",
      "delete": "admin"
    },
    "access": "customer",
    "own": [],
    "customerCan": [],
    "publicRead": true,
    "createdByFunction": false,
    "attachments": false,
    "realtime": true,
    "sort": {
      "field": "created_at",
      "dir": "desc"
    },
    "nav": true,
    "children": []
  },
  {
    "name": "shop_order",
    "label": "Order",
    "plural": "Orders",
    "slug": "orders",
    "icon": "i-lucide-shopping-bag",
    "title": "number",
    "fields": [
      {
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": true,
        "auto": false,
        "translate": false,
        "name": "number",
        "type": "integer",
        "label": "Order #",
        "list": true,
        "search": false
      },
      {
        "required": true,
        "unique": false,
        "staff": true,
        "readonly": false,
        "auto": false,
        "translate": false,
        "name": "status",
        "type": "enum",
        "options": [
          "new",
          "confirmed",
          "packed",
          "shipped",
          "delivered",
          "cancelled"
        ],
        "default": "new",
        "label": "Status",
        "list": true,
        "search": false
      },
      {
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": true,
        "auto": false,
        "translate": false,
        "name": "payment_method",
        "type": "enum",
        "options": [
          "cash",
          "click",
          "payme"
        ],
        "label": "Payment",
        "list": true,
        "search": false
      },
      {
        "required": true,
        "unique": false,
        "staff": true,
        "readonly": false,
        "auto": false,
        "translate": false,
        "name": "payment_status",
        "type": "enum",
        "options": [
          "unpaid",
          "paid",
          "refunded"
        ],
        "default": "unpaid",
        "label": "Paid",
        "list": true,
        "search": false
      },
      {
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": true,
        "auto": false,
        "translate": false,
        "name": "total",
        "type": "money",
        "label": "Total",
        "list": true,
        "search": false
      },
      {
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": true,
        "auto": false,
        "translate": false,
        "name": "customer_name",
        "type": "text",
        "label": "Customer",
        "list": true,
        "search": true
      },
      {
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": true,
        "auto": false,
        "translate": false,
        "name": "phone",
        "type": "phone",
        "label": "Phone",
        "list": true,
        "search": true
      },
      {
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": true,
        "auto": false,
        "translate": false,
        "name": "address",
        "type": "longtext",
        "list": false,
        "label": "Address",
        "search": false
      },
      {
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": true,
        "auto": false,
        "translate": false,
        "name": "note",
        "type": "longtext",
        "list": false,
        "label": "Note",
        "search": false
      },
      {
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": true,
        "auto": false,
        "translate": false,
        "name": "subtotal",
        "type": "money",
        "list": false,
        "label": "Subtotal",
        "search": false
      },
      {
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": true,
        "auto": false,
        "translate": false,
        "name": "delivery_fee",
        "type": "money",
        "list": false,
        "label": "Delivery fee",
        "search": false
      }
    ],
    "builtIn": true,
    "permissions": {
      "read": "viewer",
      "create": "owner",
      "update": "member",
      "delete": "admin"
    },
    "access": "customer",
    "own": [],
    "customerCan": [],
    "publicRead": false,
    "createdByFunction": true,
    "attachments": false,
    "realtime": true,
    "sort": {
      "field": "created_at",
      "dir": "desc"
    },
    "nav": true,
    "children": [
      {
        "entity": "shop_order_item",
        "field": "order_id"
      }
    ]
  },
  {
    "name": "shop_variant",
    "label": "Size",
    "plural": "Options",
    "slug": "options",
    "icon": "i-lucide-swatch-book",
    "title": "name",
    "fields": [
      {
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "name": "product_id",
        "type": "relation",
        "to": "product",
        "label": "Product",
        "list": true,
        "search": false,
        "alias": "product",
        "fk": "shop_variant_product_id_fkey"
      },
      {
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "name": "name",
        "type": "text",
        "max": 80,
        "label": "Name",
        "list": true,
        "search": true
      },
      {
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "name": "price",
        "type": "money",
        "min": 0,
        "help": "Leave empty to use the product price",
        "label": "Price",
        "list": true,
        "search": false
      },
      {
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "name": "stock",
        "type": "integer",
        "default": 0,
        "min": 0,
        "label": "Stock",
        "list": true,
        "search": false
      },
      {
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "name": "active",
        "type": "boolean",
        "default": true,
        "label": "Available",
        "list": true,
        "search": false
      }
    ],
    "builtIn": true,
    "permissions": {
      "read": "viewer",
      "create": "member",
      "update": "member",
      "delete": "admin"
    },
    "access": "public",
    "own": [],
    "customerCan": [],
    "publicRead": false,
    "createdByFunction": false,
    "attachments": false,
    "realtime": false,
    "sort": {
      "field": "created_at",
      "dir": "asc"
    },
    "nav": false,
    "children": [
      {
        "entity": "shop_order_item",
        "field": "variant_id"
      }
    ]
  },
  {
    "name": "shop_order_item",
    "label": "Order item",
    "plural": "Order items",
    "slug": "order-items",
    "icon": "i-lucide-package",
    "title": "title",
    "fields": [
      {
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": true,
        "auto": false,
        "translate": false,
        "name": "order_id",
        "type": "relation",
        "to": "shop_order",
        "label": "Order",
        "list": true,
        "search": false,
        "alias": "order",
        "fk": "shop_order_item_order_id_fkey"
      },
      {
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": true,
        "auto": false,
        "translate": false,
        "name": "product_id",
        "type": "relation",
        "to": "product",
        "label": "Product",
        "list": false,
        "search": false,
        "alias": "product",
        "fk": "shop_order_item_product_id_fkey"
      },
      {
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": true,
        "auto": false,
        "translate": false,
        "name": "variant_id",
        "type": "relation",
        "to": "shop_variant",
        "label": "Size",
        "list": false,
        "search": false,
        "alias": "variant",
        "fk": "shop_order_item_variant_id_fkey"
      },
      {
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": true,
        "auto": false,
        "translate": false,
        "name": "title",
        "type": "text",
        "label": "Item",
        "list": true,
        "search": true
      },
      {
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": true,
        "auto": false,
        "translate": false,
        "name": "variant_name",
        "type": "text",
        "label": "Size",
        "list": true,
        "search": true
      },
      {
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": true,
        "auto": false,
        "translate": false,
        "name": "unit_price",
        "type": "money",
        "label": "Price",
        "list": true,
        "search": false
      },
      {
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": true,
        "auto": false,
        "translate": false,
        "name": "quantity",
        "type": "integer",
        "min": 1,
        "label": "Quantity",
        "list": true,
        "search": false
      },
      {
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": true,
        "auto": false,
        "translate": false,
        "name": "line_total",
        "type": "money",
        "label": "Total",
        "list": true,
        "search": false
      }
    ],
    "builtIn": true,
    "permissions": {
      "read": "viewer",
      "create": "owner",
      "update": "owner",
      "delete": "owner"
    },
    "access": "customer",
    "own": [],
    "customerCan": [],
    "publicRead": false,
    "createdByFunction": true,
    "attachments": false,
    "realtime": false,
    "sort": {
      "field": "created_at",
      "dir": "asc"
    },
    "nav": false,
    "children": []
  }
]

export const dashboard = [
  {
    "type": "count",
    "entity": "shop_order",
    "label": "New orders",
    "where": {
      "status": "new"
    },
    "icon": "i-lucide-shopping-bag"
  },
  {
    "type": "sum",
    "entity": "shop_order",
    "field": "total",
    "label": "Revenue (paid)",
    "where": {
      "payment_status": "paid"
    },
    "icon": "i-lucide-banknote"
  },
  {
    "type": "count",
    "entity": "product",
    "icon": "i-lucide-package"
  },
  {
    "type": "breakdown",
    "entity": "shop_order",
    "field": "status",
    "label": "Orders by status"
  }
]

export const commerce = {
  "product": "product",
  "price": "price",
  "stock": "stock",
  "active": "active",
  "payments": [
    "cash",
    "click",
    "payme"
  ],
  "delivery": {
    "fee": 15000,
    "freeFrom": 200000
  },
  "orderFields": [],
  "variants": true,
  "variantLabel": "Size"
}

export const scheduling = null

export const site = {
  "hero": {
    "title": "Everything you need, from sellers near you",
    "subtitle": "Free delivery from 200 000 UZS. Pay in cash when it arrives.",
    "cta": {
      "label": "Browse products",
      "to": "/products"
    }
  },
  "sections": [
    {
      "type": "entity",
      "entity": "product",
      "title": "New arrivals",
      "limit": 12
    },
    {
      "type": "text",
      "title": "Sell on Bozor",
      "body": "Open your shop in two minutes: sign in, choose Sell on Bozor, add products. Orders arrive in your seller dashboard."
    }
  ],
  "contact": {
    "phone": "+998 71 200 00 00",
    "telegram": "bozor_support"
  }
}

export const translations = {
  "uz": {
    "Products": "Mahsulotlar",
    "Questions": "Savollar",
    "Electronics": "Elektronika",
    "Clothing": "Kiyim",
    "Shoes": "Poyabzal",
    "Home": "Uy-roʻzgʻor",
    "Beauty": "Goʻzallik",
    "Kids": "Bolalar uchun",
    "Food": "Oziq-ovqat",
    "Books": "Kitoblar",
    "Sports": "Sport",
    "New arrivals": "Yangi mahsulotlar",
    "Everything you need, from sellers near you": "Kerakli hamma narsa, yaqin sotuvchilardan",
    "Free delivery from 200 000 UZS. Pay in cash when it arrives.": "200 000 soʻmdan bepul yetkazib berish. Qabul qilganda naqd toʻlang.",
    "Browse products": "Mahsulotlarni koʻrish",
    "Sell on Bozor": "Bozorda soting",
    "Open your shop in two minutes: sign in, choose Sell on Bozor, add products. Orders arrive in your seller dashboard.": "Doʻkoningizni ikki daqiqada oching: kiring, Bozorda sotishni tanlang, mahsulot qoʻshing. Buyurtmalar sotuvchi panelingizga keladi."
  },
  "ru": {
    "Products": "Товары",
    "Questions": "Вопросы",
    "Electronics": "Электроника",
    "Clothing": "Одежда",
    "Shoes": "Обувь",
    "Home": "Для дома",
    "Beauty": "Красота",
    "Kids": "Детям",
    "Food": "Продукты",
    "Books": "Книги",
    "Sports": "Спорт",
    "New arrivals": "Новинки",
    "Everything you need, from sellers near you": "Всё нужное от продавцов рядом с вами",
    "Free delivery from 200 000 UZS. Pay in cash when it arrives.": "Бесплатная доставка от 200 000 сумов. Оплата наличными при получении.",
    "Browse products": "Смотреть товары",
    "Sell on Bozor": "Продавайте на Bozor",
    "Open your shop in two minutes: sign in, choose Sell on Bozor, add products. Orders arrive in your seller dashboard.": "Откройте магазин за две минуты: войдите, выберите продажу на Bozor, добавьте товары. Заказы придут в ваш кабинет продавца."
  }
}

export interface Product {
  id: string
  org_id: string
  name: string
  price: number
  old_price: number | null
  category: string
  brand: string | null
  description: string | null
  stock: number
  active: boolean
  tags: string[]
  cover_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  org_id: string
  product_id: string
  rating: number
  comment: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  org_id: string
  product_id: string
  question: string
  answer: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ShopOrder {
  id: string
  org_id: string
  number: number
  status: string
  payment_method: string
  payment_status: string
  total: number
  customer_name: string
  phone: string
  address: string
  note: string | null
  subtotal: number
  delivery_fee: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ShopVariant {
  id: string
  org_id: string
  product_id: string
  name: string
  price: number | null
  stock: number
  active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ShopOrderItem {
  id: string
  org_id: string
  order_id: string
  product_id: string | null
  variant_id: string | null
  title: string
  variant_name: string | null
  unit_price: number
  quantity: number
  line_total: number
  created_by: string | null
  created_at: string
  updated_at: string
}
