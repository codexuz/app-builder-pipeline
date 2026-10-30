// GENERATED from app.spec.yaml by the pipeline. Do not edit; change the spec and regenerate.
export const app = {
  "name": "Pocket Budget",
  "slug": "pocket-budget",
  "description": "Track accounts, spending and monthly budgets.",
  "tenancy": "user",
  "color": "emerald",
  "appId": "com.pocketbudget.app",
  "currency": "USD",
  "locale": "en-US",
  "publicProfiles": false
}

export const entities = [
  {
    "name": "account",
    "label": "Account",
    "plural": "Accounts",
    "slug": "accounts",
    "icon": "i-lucide-wallet",
    "title": "name",
    "fields": [
      {
        "name": "name",
        "type": "text",
        "required": true,
        "unique": true,
        "label": "Name",
        "list": true,
        "search": true
      },
      {
        "name": "kind",
        "type": "enum",
        "required": true,
        "unique": false,
        "default": "checking",
        "options": [
          "checking",
          "savings",
          "credit",
          "cash"
        ],
        "label": "Kind",
        "list": true,
        "search": false
      },
      {
        "name": "opening_balance",
        "type": "money",
        "required": false,
        "unique": false,
        "default": 0,
        "label": "Opening balance",
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
    "own": [],
    "visibility": "org",
    "attachments": false,
    "realtime": true,
    "sort": {
      "field": "created_at",
      "dir": "desc"
    },
    "nav": true,
    "children": [
      {
        "entity": "entry",
        "field": "account_id"
      }
    ]
  },
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
        "label": "Name",
        "list": true,
        "search": true
      },
      {
        "name": "kind",
        "type": "enum",
        "required": true,
        "unique": false,
        "default": "expense",
        "options": [
          "expense",
          "income"
        ],
        "label": "Kind",
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
    "own": [],
    "visibility": "org",
    "attachments": false,
    "realtime": true,
    "sort": {
      "field": "created_at",
      "dir": "desc"
    },
    "nav": true,
    "children": [
      {
        "entity": "entry",
        "field": "category_id"
      },
      {
        "entity": "budget",
        "field": "category_id"
      }
    ]
  },
  {
    "name": "entry",
    "label": "Transaction",
    "plural": "Transactions",
    "slug": "transactions",
    "icon": "i-lucide-arrow-left-right",
    "title": "description",
    "fields": [
      {
        "name": "description",
        "type": "text",
        "required": true,
        "unique": false,
        "label": "Description",
        "list": true,
        "search": true
      },
      {
        "name": "amount",
        "type": "money",
        "required": true,
        "unique": false,
        "min": 0,
        "label": "Amount",
        "list": true,
        "search": false
      },
      {
        "name": "kind",
        "type": "enum",
        "required": true,
        "unique": false,
        "default": "expense",
        "options": [
          "expense",
          "income"
        ],
        "label": "Kind",
        "list": true,
        "search": false
      },
      {
        "name": "occurred_on",
        "type": "date",
        "label": "Date",
        "required": true,
        "unique": false,
        "default": "now",
        "list": true,
        "search": false
      },
      {
        "name": "account_id",
        "type": "relation",
        "required": true,
        "unique": false,
        "to": "account",
        "label": "Account",
        "list": true,
        "search": false,
        "alias": "account",
        "fk": "entry_account_id_fkey"
      },
      {
        "name": "category_id",
        "type": "relation",
        "required": false,
        "unique": false,
        "to": "category",
        "label": "Category",
        "list": true,
        "search": false,
        "alias": "category",
        "fk": "entry_category_id_fkey"
      },
      {
        "name": "tags",
        "type": "tags",
        "required": false,
        "unique": false,
        "label": "Tags",
        "list": true,
        "search": false
      },
      {
        "name": "notes",
        "type": "longtext",
        "required": false,
        "unique": false,
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
    "own": [],
    "visibility": "org",
    "attachments": true,
    "realtime": true,
    "sort": {
      "field": "occurred_on",
      "dir": "desc"
    },
    "nav": true,
    "children": []
  },
  {
    "name": "budget",
    "label": "Budget",
    "plural": "Budgets",
    "slug": "budgets",
    "icon": "i-lucide-piggy-bank",
    "title": "category_id",
    "fields": [
      {
        "name": "category_id",
        "type": "relation",
        "required": true,
        "unique": false,
        "to": "category",
        "label": "Category",
        "list": true,
        "search": false,
        "alias": "category",
        "fk": "budget_category_id_fkey"
      },
      {
        "name": "month",
        "type": "date",
        "required": true,
        "unique": false,
        "help": "Any day in the month",
        "label": "Month",
        "list": true,
        "search": false
      },
      {
        "name": "limit_amount",
        "type": "money",
        "label": "Limit",
        "required": true,
        "unique": false,
        "min": 0,
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
    "own": [],
    "visibility": "org",
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
    "type": "sum",
    "entity": "entry",
    "field": "amount",
    "label": "Total spent",
    "where": {
      "kind": "expense"
    },
    "icon": "i-lucide-trending-down"
  },
  {
    "type": "sum",
    "entity": "entry",
    "field": "amount",
    "label": "Total income",
    "where": {
      "kind": "income"
    },
    "icon": "i-lucide-trending-up"
  },
  {
    "type": "count",
    "entity": "entry",
    "label": "Transactions",
    "icon": "i-lucide-arrow-left-right"
  },
  {
    "type": "count",
    "entity": "account",
    "label": "Accounts",
    "icon": "i-lucide-wallet"
  },
  {
    "type": "breakdown",
    "entity": "entry",
    "field": "kind",
    "label": "Income vs expense"
  }
]

export interface Account {
  id: string
  org_id: string
  name: string
  kind: string
  opening_balance: number | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  org_id: string
  name: string
  kind: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Entry {
  id: string
  org_id: string
  description: string
  amount: number
  kind: string
  occurred_on: string
  account_id: string
  category_id: string | null
  tags: string[]
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Budget {
  id: string
  org_id: string
  category_id: string
  month: string
  limit_amount: number
  created_by: string | null
  created_at: string
  updated_at: string
}
