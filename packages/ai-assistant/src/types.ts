export type AssistantRefreshTarget = "menu"

export type AssistantChange = {
  resource: "item" | "category" | "brandConfig"
  id: string
  fields: string[]
}

export type AssistantOption = {
  id: string
  label: string
}

export type AssistantHistoryMessage = {
  role: "user" | "assistant"
  content: string
}

export type AssistantCommandRequest = {
  message: string
  history?: AssistantHistoryMessage[]
}

export type AssistantCommandResponse = {
  reply: string
  changes: AssistantChange[]
  refresh: AssistantRefreshTarget[]
  needsClarification?: boolean
  options?: AssistantOption[]
}

export type AssistantExecutableIntent =
  | {
      action: "set_item_visibility"
      targetType: "item"
      targetQuery: string
      visibility: "AVAILABLE" | "SOLD_OUT" | "HIDDEN"
      requestStyle?: "standard" | "delete_alias"
    }
  | {
      action: "set_item_featured"
      targetType: "item"
      targetQuery: string
      isFeatured: boolean
    }
  | {
      action: "set_category_visibility"
      targetType: "category"
      targetQuery: string
      visibility: "AVAILABLE" | "HIDDEN"
      requestStyle?: "standard" | "delete_alias"
    }
  | {
      action: "add_category"
      categoryName: string
      visibility?: "AVAILABLE" | "HIDDEN"
    }
  | {
      action: "add_item"
      targetType: "category"
      targetQuery: string
      itemName: string
      price: number
      description?: string
      isFeatured?: boolean
    }
  | {
      action: "update_item"
      targetType: "item"
      targetQuery: string
      name?: string
      price?: number
      description?: string
    }
  | {
      action: "set_item_price"
      targetType: "item"
      targetQuery: string
      price: number
    }
  | {
      action: "update_brand_config"
      heroHeadline?: string
      heroSubheadline?: string
      heroBadgeText?: string
      promoBannerText?: string
    }

export type AssistantPlannerResult =
  | {
      kind: "actions"
      actions: AssistantExecutableIntent[]
    }
  | {
      kind: "clarification"
      message: string
    }
  | {
      kind: "unsupported"
      message: string
    }
