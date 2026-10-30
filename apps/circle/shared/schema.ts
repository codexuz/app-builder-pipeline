// GENERATED from app.spec.yaml by the pipeline. Do not edit; change the spec and regenerate.
export const app = {
  "name": "Circle",
  "slug": "circle",
  "description": "A small community to share posts, comment and follow people.",
  "type": "personal",
  "color": "violet",
  "appId": "com.circle.social",
  "currency": "USD",
  "locale": "en-US",
  "publicProfiles": true,
  "publicSite": false
}

export const entities = [
  {
    "name": "post",
    "label": "Post",
    "plural": "Posts",
    "slug": "posts",
    "icon": "i-lucide-message-square-text",
    "title": "headline",
    "fields": [
      {
        "name": "headline",
        "type": "text",
        "required": true,
        "unique": false,
        "max": 140,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Headline",
        "list": true,
        "search": true
      },
      {
        "name": "body",
        "type": "longtext",
        "required": true,
        "unique": false,
        "max": 5000,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Body",
        "list": false,
        "search": false
      },
      {
        "name": "topic",
        "type": "enum",
        "required": true,
        "unique": false,
        "default": "general",
        "options": [
          "general",
          "question",
          "showcase",
          "news"
        ],
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Topic",
        "list": true,
        "search": false
      },
      {
        "name": "link",
        "type": "url",
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Link",
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
        "label": "Tags",
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
    "access": "members",
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
        "entity": "comment",
        "field": "post_id"
      },
      {
        "entity": "bookmark",
        "field": "post_id"
      }
    ]
  },
  {
    "name": "comment",
    "label": "Comment",
    "plural": "Comments",
    "slug": "comments",
    "icon": "i-lucide-messages-square",
    "title": "body",
    "fields": [
      {
        "name": "post_id",
        "type": "relation",
        "required": true,
        "unique": false,
        "to": "post",
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Post",
        "list": true,
        "search": false,
        "alias": "post",
        "fk": "comment_post_id_fkey"
      },
      {
        "name": "body",
        "type": "longtext",
        "required": true,
        "unique": false,
        "max": 2000,
        "list": true,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Body",
        "search": false
      }
    ],
    "permissions": {
      "read": "viewer",
      "create": "member",
      "update": "member",
      "delete": "admin"
    },
    "access": "members",
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
    "nav": false,
    "children": []
  },
  {
    "name": "follow",
    "label": "Follow",
    "plural": "Follows",
    "slug": "follows",
    "icon": "i-lucide-user-plus",
    "title": "following_id",
    "fields": [
      {
        "name": "following_id",
        "type": "user",
        "label": "Following",
        "required": true,
        "unique": true,
        "staff": false,
        "readonly": false,
        "auto": false,
        "list": true,
        "search": false,
        "alias": "following",
        "fk": "follow_following_id_fkey"
      }
    ],
    "permissions": {
      "read": "viewer",
      "create": "member",
      "update": "member",
      "delete": "admin"
    },
    "access": "members",
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
    "name": "bookmark",
    "label": "Bookmark",
    "plural": "Bookmarks",
    "slug": "bookmarks",
    "icon": "i-lucide-bookmark",
    "title": "post_id",
    "fields": [
      {
        "name": "post_id",
        "type": "relation",
        "required": true,
        "unique": true,
        "to": "post",
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Post",
        "list": true,
        "search": false,
        "alias": "post",
        "fk": "bookmark_post_id_fkey"
      },
      {
        "name": "note",
        "type": "text",
        "required": false,
        "unique": false,
        "staff": false,
        "readonly": false,
        "auto": false,
        "label": "Note",
        "list": true,
        "search": true
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
    "children": []
  }
]

export const dashboard = [
  {
    "type": "count",
    "entity": "post",
    "label": "My posts",
    "icon": "i-lucide-message-square-text"
  },
  {
    "type": "count",
    "entity": "comment",
    "label": "My comments",
    "icon": "i-lucide-messages-square"
  },
  {
    "type": "count",
    "entity": "follow",
    "label": "Following",
    "icon": "i-lucide-user-plus"
  },
  {
    "type": "count",
    "entity": "bookmark",
    "label": "Bookmarks",
    "icon": "i-lucide-bookmark"
  },
  {
    "type": "breakdown",
    "entity": "post",
    "field": "topic",
    "label": "My posts by topic"
  }
]

export const commerce = null

export const site = null

export interface Post {
  id: string
  org_id: string
  headline: string
  body: string
  topic: string
  link: string | null
  tags: string[]
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  org_id: string
  post_id: string
  body: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Follow {
  id: string
  org_id: string
  following_id: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Bookmark {
  id: string
  org_id: string
  post_id: string
  note: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}
