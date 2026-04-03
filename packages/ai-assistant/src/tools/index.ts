import { addCategoryTool } from "./addCategory.js"
import { addItemTool } from "./addItem.js"
import { setCategoryVisibilityTool } from "./setCategoryVisibility.js"
import { setItemFeaturedTool } from "./setItemFeatured.js"
import { setItemPriceTool } from "./setItemPrice.js"
import { setItemVisibilityTool } from "./setItemVisibility.js"
import { updateBrandConfigTool } from "./updateBrandConfig.js"
import { updateItemTool } from "./updateItem.js"

export const assistantMutationTools = {
  add_category: addCategoryTool,
  add_item: addItemTool,
  set_item_visibility: setItemVisibilityTool,
  set_item_featured: setItemFeaturedTool,
  set_item_price: setItemPriceTool,
  set_category_visibility: setCategoryVisibilityTool,
  update_brand_config: updateBrandConfigTool,
  update_item: updateItemTool,
}
