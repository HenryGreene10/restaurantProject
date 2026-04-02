export type AssistantRefreshTarget = "menu"

export type AssistantChange = {
  resource: "item" | "category"
  id: string
  fields: string[]
}

export type AssistantOption = {
  id: string
  label: string
}

export type AssistantCommandRequest = {
  message: string
}

export type AssistantCommandResponse = {
  reply: string
  changes: AssistantChange[]
  refresh: AssistantRefreshTarget[]
  needsClarification?: boolean
  options?: AssistantOption[]
}

export type AssistantMutationIntent =
  | {
      action: "set_item_visibility"
      targetType: "item"
      targetQuery: string
      visibility: "AVAILABLE" | "SOLD_OUT" | "HIDDEN"
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
    }
  | {
      action: "unsupported"
      message: string
    }
