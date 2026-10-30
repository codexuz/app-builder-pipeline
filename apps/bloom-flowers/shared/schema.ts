// GENERATED from app.spec.yaml by the pipeline. Do not edit; change the spec and regenerate.
export const app = {
  "name": "Bloom Flowers",
  "slug": "bloom-flowers",
  "description": "Fresh bouquets delivered across Tashkent the same day.",
  "type": "business",
  "color": "rose",
  "appId": "uz.bloom.flowers",
  "currency": "UZS",
  "locale": "en-US",
  "publicProfiles": false,
  "publicSite": true
}

export const entities = [
  {
    "name": "category",
    "label": "Category",
    "plural": "Categories",
    "slug": "categories",
    "icon": "i-lucide-tags",
    "title": "name",
    "fields": [
      {
        "name": "name",
        "type": "text",
        "required": true,
        "unique": true,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Name",
        "list": true,
        "search": true
      },
      {
        "name": "description",
        "type": "longtext",
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Description",
        "list": false,
        "search": false
      }
    ],
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
    "realtime": true,
    "sort": {
      "field": "created_at",
      "dir": "desc"
    },
    "nav": true,
    "children": [
      {
        "entity": "bouquet",
        "field": "category_id"
      }
    ]
  },
  {
    "name": "bouquet",
    "label": "Bouquet",
    "plural": "Bouquets",
    "slug": "bouquets",
    "icon": "i-lucide-flower",
    "title": "name",
    "fields": [
      {
        "name": "name",
        "type": "text",
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
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
        "label": "Price",
        "list": true,
        "search": false
      },
      {
        "name": "category_id",
        "type": "relation",
        "label": "Category",
        "required": false,
        "unique": false,
        "to": "category",
        "staff": false,
        "readonly": false,
        "auto": false,
        "list": true,
        "search": false,
        "alias": "category",
        "fk": "bouquet_category_id_fkey"
      },
      {
        "name": "size",
        "type": "enum",
        "required": true,
        "unique": false,
        "default": "medium",
        "options": [
          "small",
          "medium",
          "large"
        ],
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Size",
        "list": true,
        "search": false
      },
      {
        "name": "description",
        "type": "longtext",
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
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
        "label": "Stock",
        "list": true,
        "search": false
      },
      {
        "name": "available",
        "type": "boolean",
        "required": false,
        "unique": false,
        "default": true,
        "help": "Unavailable bouquets are hidden from the shop",
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Available",
        "list": true,
        "search": false
      },
      {
        "name": "cover_url",
        "type": "url",
        "label": "Cover image",
        "required": false,
        "unique": false,
        "list": false,
        "staff": true,
        "readonly": false,
        "auto": true,
        "search": false
      }
    ],
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
      "field": "name",
      "dir": "asc"
    },
    "nav": true,
    "children": [
      {
        "entity": "review",
        "field": "bouquet_id"
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
    "title": "bouquet_id",
    "fields": [
      {
        "name": "bouquet_id",
        "type": "relation",
        "label": "Bouquet",
        "required": true,
        "unique": false,
        "to": "bouquet",
        "staff": false,
        "readonly": false,
        "auto": false,
        "list": true,
        "search": false,
        "alias": "bouquet",
        "fk": "review_bouquet_id_fkey"
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
        "label": "Rating",
        "list": true,
        "search": false
      },
      {
        "name": "comment",
        "type": "longtext",
        "required": true,
        "unique": false,
        "max": 1000,
        "list": true,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Comment",
        "search": false
      }
    ],
    "permissions": {
      "read": "viewer",
      "create": "member",
      "update": "member",
      "delete": "admin"
    },
    "access": "customer",
    "own": [],
    "customerCan": [
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
    "name": "inquiry",
    "label": "Inquiry",
    "plural": "Messages",
    "slug": "messages",
    "icon": "i-lucide-mail",
    "title": "name",
    "fields": [
      {
        "name": "name",
        "type": "text",
        "required": true,
        "unique": false,
        "max": 120,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Name",
        "list": true,
        "search": true
      },
      {
        "name": "phone",
        "type": "phone",
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Phone",
        "list": true,
        "search": true
      },
      {
        "name": "message",
        "type": "longtext",
        "required": true,
        "unique": false,
        "max": 2000,
        "list": true,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Message",
        "search": false
      },
      {
        "name": "status",
        "type": "enum",
        "required": true,
        "unique": false,
        "default": "new",
        "options": [
          "new",
          "answered"
        ],
        "staff": true,
        "readonly": false,
        "auto": false,
        "label": "Status",
        "list": true,
        "search": false
      }
    ],
    "permissions": {
      "read": "viewer",
      "create": "member",
      "update": "member",
      "delete": "admin"
    },
    "access": "inbox",
    "own": [],
    "customerCan": [],
    "publicRead": false,
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
        "name": "payment_method",
        "type": "enum",
        "options": [
          "cash"
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
        "name": "address",
        "type": "longtext",
        "list": false,
        "label": "Address",
        "search": false
      },
      {
        "name": "delivery_date",
        "type": "date",
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": true,
        "auto": false,
        "label": "Delivery date",
        "list": true,
        "search": false
      },
      {
        "name": "delivery_time",
        "type": "enum",
        "required": true,
        "unique": false,
        "options": [
          "morning",
          "afternoon",
          "evening"
        ],
        "staff": false,
        "readonly": true,
        "auto": false,
        "label": "Delivery time",
        "list": true,
        "search": false
      },
      {
        "name": "recipient_name",
        "type": "text",
        "label": "Recipient",
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": true,
        "auto": false,
        "list": true,
        "search": true
      },
      {
        "name": "card_message",
        "type": "longtext",
        "label": "Card message",
        "required": false,
        "unique": false,
        "max": 300,
        "staff": false,
        "readonly": true,
        "auto": false,
        "list": false,
        "search": false
      },
      {
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": true,
        "auto": false,
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
        "name": "delivery_fee",
        "type": "money",
        "list": false,
        "label": "Delivery fee",
        "search": false
      }
    ],
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
        "name": "product_id",
        "type": "relation",
        "to": "bouquet",
        "label": "Product",
        "list": false,
        "search": false,
        "alias": "product",
        "fk": "shop_order_item_product_id_fkey"
      },
      {
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": true,
        "auto": false,
        "name": "title",
        "type": "text",
        "label": "Item",
        "list": true,
        "search": true
      },
      {
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": true,
        "auto": false,
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
        "name": "line_total",
        "type": "money",
        "label": "Total",
        "list": true,
        "search": false
      }
    ],
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
    "entity": "bouquet",
    "icon": "i-lucide-flower"
  },
  {
    "type": "breakdown",
    "entity": "shop_order",
    "field": "status",
    "label": "Orders by status"
  }
]

export const commerce = {
  "product": "bouquet",
  "price": "price",
  "stock": "stock",
  "active": "available",
  "payments": [
    "cash"
  ],
  "delivery": {
    "fee": 30000,
    "freeFrom": 500000
  },
  "orderFields": [
    {
      "name": "delivery_date",
      "type": "date",
      "required": true,
      "unique": false,
      "cascade": false,
      "staff": false,
      "readonly": false,
      "auto": false
    },
    {
      "name": "delivery_time",
      "type": "enum",
      "required": true,
      "unique": false,
      "options": [
        "morning",
        "afternoon",
        "evening"
      ],
      "cascade": false,
      "staff": false,
      "readonly": false,
      "auto": false
    },
    {
      "name": "recipient_name",
      "type": "text",
      "label": "Recipient",
      "required": false,
      "unique": false,
      "cascade": false,
      "staff": false,
      "readonly": false,
      "auto": false
    },
    {
      "name": "card_message",
      "type": "longtext",
      "label": "Card message",
      "required": false,
      "unique": false,
      "cascade": false,
      "max": 300,
      "staff": false,
      "readonly": false,
      "auto": false
    }
  ]
}

export const site = {
  "hero": {
    "title": "Fresh flowers, delivered today",
    "subtitle": "Hand-tied bouquets from Tashkent florists. Order before 14:00 for same-day delivery.",
    "cta": {
      "label": "Shop bouquets",
      "to": "/bouquets"
    }
  },
  "sections": [
    {
      "type": "entity",
      "entity": "bouquet",
      "title": "Popular bouquets",
      "limit": 8
    },
    {
      "type": "text",
      "title": "Same-day delivery",
      "body": "Delivery is free from 500 000 UZS. We call before arriving and send a photo of your bouquet."
    },
    {
      "type": "entity",
      "entity": "review",
      "title": "What customers say",
      "limit": 6
    },
    {
      "type": "form",
      "entity": "inquiry",
      "title": "Questions? Write to us",
      "description": "We reply within an hour during opening times."
    }
  ],
  "contact": {
    "phone": "+998 90 123 45 67",
    "address": "Tashkent, Yunusabad",
    "hours": "Every day 8:00 to 21:00",
    "telegram": "bloomflowers",
    "instagram": "bloom.flowers.uz"
  }
}

export interface Category {
  id: string
  org_id: string
  name: string
  description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Bouquet {
  id: string
  org_id: string
  name: string
  price: number
  category_id: string | null
  size: string
  description: string | null
  stock: number
  available: boolean
  cover_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  org_id: string
  bouquet_id: string
  rating: number
  comment: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Inquiry {
  id: string
  org_id: string
  name: string
  phone: string
  message: string
  status: string
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
  delivery_date: string
  delivery_time: string
  recipient_name: string | null
  card_message: string | null
  note: string | null
  subtotal: number
  delivery_fee: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ShopOrderItem {
  id: string
  org_id: string
  order_id: string
  product_id: string | null
  title: string
  unit_price: number
  quantity: number
  line_total: number
  created_by: string | null
  created_at: string
  updated_at: string
}
