// GENERATED from app.spec.yaml by the pipeline. Do not edit; change the spec and regenerate.
export const app = {
  "name": "Lumen Studio",
  "slug": "lumen-studio",
  "description": "Hair, nails and skin care in the centre of Samarkand.",
  "type": "business",
  "color": "teal",
  "appId": "uz.lumen.studio",
  "currency": "UZS",
  "locale": "en-US",
  "publicProfiles": false,
  "publicSite": true
}

export const entities = [
  {
    "name": "service",
    "label": "Service",
    "plural": "Services",
    "slug": "services",
    "icon": "i-lucide-sparkles",
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
        "name": "category",
        "type": "enum",
        "required": true,
        "unique": false,
        "default": "hair",
        "options": [
          "hair",
          "nails",
          "skin",
          "makeup"
        ],
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Category",
        "list": true,
        "search": false
      },
      {
        "name": "price",
        "type": "money",
        "label": "Price from",
        "required": true,
        "unique": false,
        "min": 0,
        "staff": false,
        "readonly": false,
        "auto": false,
        "list": true,
        "search": false
      },
      {
        "name": "duration_minutes",
        "type": "integer",
        "label": "Duration (minutes)",
        "required": true,
        "unique": false,
        "default": 60,
        "min": 15,
        "max": 480,
        "staff": false,
        "readonly": false,
        "auto": false,
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
        "entity": "booking",
        "field": "service_id"
      }
    ]
  },
  {
    "name": "specialist",
    "label": "Specialist",
    "plural": "Specialists",
    "slug": "specialists",
    "icon": "i-lucide-user-round",
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
        "name": "role",
        "type": "text",
        "required": true,
        "unique": false,
        "max": 120,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Role",
        "list": true,
        "search": true
      },
      {
        "name": "bio",
        "type": "longtext",
        "required": false,
        "unique": false,
        "max": 2000,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Bio",
        "list": false,
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
      "field": "created_at",
      "dir": "desc"
    },
    "nav": true,
    "children": [
      {
        "entity": "booking",
        "field": "specialist_id"
      }
    ]
  },
  {
    "name": "booking",
    "label": "Booking",
    "plural": "Bookings",
    "slug": "bookings",
    "icon": "i-lucide-calendar-check",
    "title": "service_id",
    "fields": [
      {
        "name": "service_id",
        "type": "relation",
        "label": "Service",
        "required": true,
        "unique": false,
        "to": "service",
        "staff": false,
        "readonly": false,
        "auto": false,
        "list": true,
        "search": false,
        "alias": "service",
        "fk": "booking_service_id_fkey"
      },
      {
        "name": "specialist_id",
        "type": "relation",
        "label": "Specialist",
        "required": false,
        "unique": false,
        "to": "specialist",
        "help": "Leave empty for the first free specialist",
        "staff": false,
        "readonly": false,
        "auto": false,
        "list": true,
        "search": false,
        "alias": "specialist",
        "fk": "booking_specialist_id_fkey"
      },
      {
        "name": "date",
        "type": "date",
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Date",
        "list": true,
        "search": false
      },
      {
        "name": "time",
        "type": "enum",
        "required": true,
        "unique": false,
        "options": [
          "09:00",
          "10:00",
          "11:00",
          "12:00",
          "14:00",
          "15:00",
          "16:00",
          "17:00",
          "18:00"
        ],
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Time",
        "list": true,
        "search": false
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
        "name": "note",
        "type": "longtext",
        "required": false,
        "unique": false,
        "max": 500,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Note",
        "list": false,
        "search": false
      },
      {
        "name": "status",
        "type": "enum",
        "required": true,
        "unique": false,
        "default": "requested",
        "options": [
          "requested",
          "confirmed",
          "completed",
          "cancelled"
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
    "access": "customer",
    "own": [],
    "customerCan": [
      "delete"
    ],
    "publicRead": false,
    "createdByFunction": false,
    "attachments": false,
    "realtime": true,
    "sort": {
      "field": "date",
      "dir": "asc"
    },
    "nav": true,
    "children": []
  },
  {
    "name": "testimonial",
    "label": "Testimonial",
    "plural": "Testimonials",
    "slug": "testimonials",
    "icon": "i-lucide-quote",
    "title": "text",
    "fields": [
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
        "name": "text",
        "type": "longtext",
        "required": true,
        "unique": false,
        "max": 1000,
        "list": true,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Text",
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
  }
]

export const dashboard = [
  {
    "type": "count",
    "entity": "booking",
    "label": "Booking requests",
    "where": {
      "status": "requested"
    },
    "icon": "i-lucide-calendar-clock"
  },
  {
    "type": "count",
    "entity": "booking",
    "label": "Confirmed",
    "where": {
      "status": "confirmed"
    },
    "icon": "i-lucide-calendar-check"
  },
  {
    "type": "count",
    "entity": "inquiry",
    "label": "New messages",
    "where": {
      "status": "new"
    },
    "icon": "i-lucide-mail"
  },
  {
    "type": "breakdown",
    "entity": "booking",
    "field": "status",
    "label": "Bookings by status"
  }
]

export const commerce = null

export const site = {
  "hero": {
    "title": "Take an hour for yourself",
    "subtitle": "Book a haircut, manicure or facial in a few taps. We confirm by phone within 15 minutes.",
    "cta": {
      "label": "Book a visit",
      "to": "/bookings/new"
    }
  },
  "sections": [
    {
      "type": "entity",
      "entity": "service",
      "title": "Services",
      "limit": 8
    },
    {
      "type": "entity",
      "entity": "specialist",
      "title": "Our team",
      "limit": 6
    },
    {
      "type": "entity",
      "entity": "testimonial",
      "title": "Reviews",
      "limit": 6
    },
    {
      "type": "form",
      "entity": "inquiry",
      "title": "Ask us anything"
    }
  ],
  "contact": {
    "phone": "+998 66 233 00 00",
    "address": "Samarkand, Registan street 12",
    "hours": "Tue to Sun, 9:00 to 19:00",
    "instagram": "lumen.studio.uz"
  }
}

export interface Service {
  id: string
  org_id: string
  name: string
  category: string
  price: number
  duration_minutes: number
  description: string | null
  cover_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Specialist {
  id: string
  org_id: string
  name: string
  role: string
  bio: string | null
  cover_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  org_id: string
  service_id: string
  specialist_id: string | null
  date: string
  time: string
  phone: string
  note: string | null
  status: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Testimonial {
  id: string
  org_id: string
  rating: number
  text: string
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
