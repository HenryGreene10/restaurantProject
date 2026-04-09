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

export type AssistantScheduleDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday"

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
      prepTimeMinutes?: number
      tags?: string[]
      specialInstructionsEnabled?: boolean
      visibility?: "AVAILABLE" | "SOLD_OUT" | "HIDDEN"
    }
  | {
      action: "set_item_price"
      targetType: "item"
      targetQuery: string
      price: number
    }
  | {
      action: "create_modifier_group"
      targetType: "item"
      targetQuery: string
      groupName: string
      required?: boolean
      minSelections?: number
      maxSelections?: number | null
    }
  | {
      action: "create_modifier_option"
      targetType: "item"
      targetQuery: string
      groupName: string
      optionName: string
      priceAdjustment?: number
    }
  | {
      action: "schedule_category"
      targetType: "category"
      targetQuery: string
      availableFrom: string
      availableUntil: string
      daysOfWeek?: AssistantScheduleDay[]
    }
  | {
      action: "set_item_image"
      targetType: "item"
      targetQuery: string
      photoUrl: string
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
