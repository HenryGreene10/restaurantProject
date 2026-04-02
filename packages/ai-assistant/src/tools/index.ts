import { setCategoryVisibilityTool } from "./setCategoryVisibility.js"
import { setItemFeaturedTool } from "./setItemFeatured.js"
import { setItemVisibilityTool } from "./setItemVisibility.js"

export const assistantMutationTools = {
  set_item_visibility: setItemVisibilityTool,
  set_item_featured: setItemFeaturedTool,
  set_category_visibility: setCategoryVisibilityTool,
}
