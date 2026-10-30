// GENERATED from app.spec.yaml by the pipeline. Do not edit; change the spec and regenerate.
export const app = {
  "name": "Acme CRM",
  "slug": "acme-crm",
  "description": "Track companies, contacts, deals and follow-up tasks as a team.",
  "type": "team",
  "color": "indigo",
  "appId": "com.acme.crm",
  "currency": "USD",
  "locale": "en-US",
  "publicProfiles": false,
  "publicSite": false
}

export const entities = [
  {
    "name": "company",
    "label": "Company",
    "plural": "Companies",
    "slug": "companies",
    "icon": "i-lucide-building-2",
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
        "name": "industry",
        "type": "enum",
        "required": false,
        "unique": false,
        "options": [
          "software",
          "retail",
          "healthcare",
          "manufacturing",
          "finance",
          "other"
        ],
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Industry",
        "list": true,
        "search": false
      },
      {
        "name": "website",
        "type": "url",
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Website",
        "list": true,
        "search": false
      },
      {
        "name": "phone",
        "type": "phone",
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Phone",
        "list": true,
        "search": true
      },
      {
        "name": "employees",
        "type": "integer",
        "required": false,
        "unique": false,
        "min": 0,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Employees",
        "list": true,
        "search": false
      },
      {
        "name": "notes",
        "type": "longtext",
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Notes",
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
    "access": "team",
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
        "entity": "contact",
        "field": "company_id"
      },
      {
        "entity": "deal",
        "field": "company_id"
      }
    ]
  },
  {
    "name": "contact",
    "label": "Contact",
    "plural": "Contacts",
    "slug": "contacts",
    "icon": "i-lucide-contact",
    "title": "full_name",
    "fields": [
      {
        "name": "full_name",
        "type": "text",
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Full name",
        "list": true,
        "search": true
      },
      {
        "name": "email",
        "type": "email",
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Email",
        "list": true,
        "search": true
      },
      {
        "name": "phone",
        "type": "phone",
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Phone",
        "list": true,
        "search": true
      },
      {
        "name": "job_title",
        "type": "text",
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Job title",
        "list": true,
        "search": true
      },
      {
        "name": "company_id",
        "type": "relation",
        "required": false,
        "unique": false,
        "to": "company",
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Company",
        "list": true,
        "search": false,
        "alias": "company",
        "fk": "contact_company_id_fkey"
      },
      {
        "name": "status",
        "type": "enum",
        "required": false,
        "unique": false,
        "default": "lead",
        "options": [
          "lead",
          "customer",
          "churned"
        ],
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Status",
        "list": true,
        "search": false
      },
      {
        "name": "owner_id",
        "type": "user",
        "label": "Owner",
        "required": false,
        "unique": false,
        "default": "me",
        "staff": false,
        "readonly": false,
        "auto": false,
        "list": true,
        "search": false,
        "alias": "owner",
        "fk": "contact_owner_id_fkey"
      }
    ],
    "permissions": {
      "read": "viewer",
      "create": "member",
      "update": "member",
      "delete": "admin"
    },
    "access": "team",
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
        "entity": "deal",
        "field": "contact_id"
      }
    ]
  },
  {
    "name": "deal",
    "label": "Deal",
    "plural": "Deals",
    "slug": "deals",
    "icon": "i-lucide-handshake",
    "title": "title",
    "fields": [
      {
        "name": "title",
        "type": "text",
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Title",
        "list": true,
        "search": true
      },
      {
        "name": "company_id",
        "type": "relation",
        "required": true,
        "unique": false,
        "to": "company",
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Company",
        "list": true,
        "search": false,
        "alias": "company",
        "fk": "deal_company_id_fkey"
      },
      {
        "name": "contact_id",
        "type": "relation",
        "required": false,
        "unique": false,
        "to": "contact",
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Contact",
        "list": true,
        "search": false,
        "alias": "contact",
        "fk": "deal_contact_id_fkey"
      },
      {
        "name": "amount",
        "type": "money",
        "required": false,
        "unique": false,
        "min": 0,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Amount",
        "list": true,
        "search": false
      },
      {
        "name": "stage",
        "type": "enum",
        "required": false,
        "unique": false,
        "default": "lead",
        "options": [
          "lead",
          "qualified",
          "proposal",
          "won",
          "lost"
        ],
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Stage",
        "list": true,
        "search": false
      },
      {
        "name": "probability",
        "type": "percent",
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Probability",
        "list": true,
        "search": false
      },
      {
        "name": "close_date",
        "type": "date",
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Close date",
        "list": true,
        "search": false
      },
      {
        "name": "owner_id",
        "type": "user",
        "label": "Owner",
        "required": false,
        "unique": false,
        "default": "me",
        "staff": false,
        "readonly": false,
        "auto": false,
        "list": true,
        "search": false,
        "alias": "owner",
        "fk": "deal_owner_id_fkey"
      }
    ],
    "permissions": {
      "read": "viewer",
      "create": "member",
      "update": "member",
      "delete": "admin"
    },
    "access": "team",
    "own": [],
    "customerCan": [],
    "publicRead": false,
    "createdByFunction": false,
    "attachments": true,
    "realtime": true,
    "sort": {
      "field": "close_date",
      "dir": "asc"
    },
    "nav": true,
    "children": [
      {
        "entity": "task",
        "field": "deal_id"
      }
    ]
  },
  {
    "name": "task",
    "label": "Task",
    "plural": "Tasks",
    "slug": "tasks",
    "icon": "i-lucide-list-checks",
    "title": "title",
    "fields": [
      {
        "name": "title",
        "type": "text",
        "required": true,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Title",
        "list": true,
        "search": true
      },
      {
        "name": "due_date",
        "type": "date",
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Due date",
        "list": true,
        "search": false
      },
      {
        "name": "done",
        "type": "boolean",
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Done",
        "list": true,
        "search": false
      },
      {
        "name": "priority",
        "type": "enum",
        "required": false,
        "unique": false,
        "default": "normal",
        "options": [
          "low",
          "normal",
          "high"
        ],
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Priority",
        "list": true,
        "search": false
      },
      {
        "name": "deal_id",
        "type": "relation",
        "required": false,
        "unique": false,
        "to": "deal",
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Deal",
        "list": true,
        "search": false,
        "alias": "deal",
        "fk": "task_deal_id_fkey"
      },
      {
        "name": "assignee_id",
        "type": "user",
        "label": "Assignee",
        "required": false,
        "unique": false,
        "default": "me",
        "staff": false,
        "readonly": false,
        "auto": false,
        "list": true,
        "search": false,
        "alias": "assignee",
        "fk": "task_assignee_id_fkey"
      }
    ],
    "permissions": {
      "read": "viewer",
      "create": "member",
      "update": "member",
      "delete": "member"
    },
    "access": "team",
    "own": [
      "delete"
    ],
    "customerCan": [],
    "publicRead": false,
    "createdByFunction": false,
    "attachments": false,
    "realtime": true,
    "sort": {
      "field": "due_date",
      "dir": "asc"
    },
    "nav": true,
    "children": []
  }
]

export const dashboard = [
  {
    "type": "count",
    "entity": "deal",
    "label": "Open deals",
    "where": {
      "stage": [
        "lead",
        "qualified",
        "proposal"
      ]
    },
    "icon": "i-lucide-handshake"
  },
  {
    "type": "sum",
    "entity": "deal",
    "field": "amount",
    "label": "Pipeline value",
    "where": {
      "stage": [
        "lead",
        "qualified",
        "proposal"
      ]
    },
    "icon": "i-lucide-circle-dollar-sign"
  },
  {
    "type": "sum",
    "entity": "deal",
    "field": "amount",
    "label": "Won revenue",
    "where": {
      "stage": "won"
    },
    "icon": "i-lucide-trophy"
  },
  {
    "type": "count",
    "entity": "task",
    "label": "Open tasks",
    "where": {
      "done": false
    },
    "icon": "i-lucide-list-checks"
  },
  {
    "type": "breakdown",
    "entity": "deal",
    "field": "stage",
    "label": "Deals by stage"
  },
  {
    "type": "breakdown",
    "entity": "contact",
    "field": "status",
    "label": "Contacts by status"
  }
]

export const commerce = null

export const site = null

export interface Company {
  id: string
  org_id: string
  name: string
  industry: string | null
  website: string | null
  phone: string | null
  employees: number | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  org_id: string
  full_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  company_id: string | null
  status: string | null
  owner_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Deal {
  id: string
  org_id: string
  title: string
  company_id: string
  contact_id: string | null
  amount: number | null
  stage: string | null
  probability: number | null
  close_date: string | null
  owner_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  org_id: string
  title: string
  due_date: string | null
  done: boolean
  priority: string | null
  deal_id: string | null
  assignee_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}
