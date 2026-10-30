// GENERATED from app.spec.yaml by the pipeline. Do not edit; change the spec and regenerate.
export const app = {
  "name": "Adras Atelier",
  "slug": "adras-atelier",
  "description": "Modern clothes cut from hand-woven Uzbek adras.",
  "type": "business",
  "style": "fashion",
  "color": "pink",
  "appId": "uz.adras.atelier",
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
    "name": "garment",
    "label": "Garment",
    "plural": "Clothes",
    "slug": "clothes",
    "icon": "i-lucide-shirt",
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
        "translate": true,
        "label": "Name",
        "list": true,
        "search": true
      },
      {
        "name": "name_ru",
        "type": "text",
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "list": false,
        "label": "Name (RU)",
        "search": true
      },
      {
        "name": "name_en",
        "type": "text",
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "list": false,
        "label": "Name (EN)",
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
        "name": "kind",
        "type": "enum",
        "required": true,
        "unique": false,
        "default": "dress",
        "options": [
          "dress",
          "jacket",
          "coat"
        ],
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "label": "Kind",
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
        "translate": true,
        "label": "Description",
        "list": false,
        "search": false
      },
      {
        "name": "description_ru",
        "type": "longtext",
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "list": false,
        "label": "Description (RU)",
        "search": false
      },
      {
        "name": "description_en",
        "type": "longtext",
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "list": false,
        "label": "Description (EN)",
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
        "name": "available",
        "type": "boolean",
        "required": false,
        "unique": false,
        "default": true,
        "staff": false,
        "readonly": false,
        "auto": false,
        "translate": false,
        "label": "Available",
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
        "to": "garment",
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
        "to": "garment",
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
    "entity": "garment",
    "icon": "i-lucide-shirt"
  },
  {
    "type": "breakdown",
    "entity": "shop_order",
    "field": "status",
    "label": "Orders by status"
  }
]

export const commerce = {
  "product": "garment",
  "price": "price",
  "stock": "stock",
  "active": "available",
  "payments": [
    "cash",
    "click",
    "payme"
  ],
  "delivery": {
    "fee": 25000,
    "freeFrom": 1000000
  },
  "orderFields": [],
  "variants": true,
  "variantLabel": "Size"
}

export const scheduling = null

export const site = {
  "hero": {
    "title": "Woven by hand",
    "subtitle": "Modern clothes cut from hand-woven Uzbek adras.",
    "cta": {
      "label": "See the collection",
      "to": "/clothes"
    }
  },
  "sections": [
    {
      "type": "entity",
      "entity": "garment",
      "title": "New collection",
      "limit": 6
    }
  ],
  "contact": {
    "telegram": "adras_atelier",
    "instagram": "adras.atelier"
  }
}

export const translations = {
  "uz": {
    "Modern clothes cut from hand-woven Uzbek adras.": "Oʻzbek adrasidan tikilgan zamonaviy kiyimlar.",
    "Clothes": "Kiyimlar",
    "Garment": "Kiyim",
    "Dress": "Koʻylak",
    "Jacket": "Kurtka",
    "Coat": "Palto",
    "Woven by hand": "Qoʻlda toʻqilgan",
    "New collection": "Yangi toʻplam",
    "See the collection": "Toʻplamni koʻrish"
  },
  "ru": {
    "Modern clothes cut from hand-woven Uzbek adras.": "Современная одежда из узбекского адраса.",
    "Clothes": "Одежда",
    "Garment": "Изделие",
    "Dress": "Платье",
    "Jacket": "Жакет",
    "Coat": "Пальто",
    "Woven by hand": "Сотканное вручную",
    "New collection": "Новая коллекция",
    "See the collection": "Смотреть коллекцию"
  }
}

export interface Garment {
  id: string
  org_id: string
  name: string
  name_ru: string | null
  name_en: string | null
  price: number
  kind: string
  description: string | null
  description_ru: string | null
  description_en: string | null
  stock: number
  available: boolean
  cover_url: string | null
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
