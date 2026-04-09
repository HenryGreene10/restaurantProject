import { addCategoryTool } from "./addCategory.js"
import { addItemTool } from "./addItem.js"
import { createModifierGroupTool } from "./createModifierGroup.js"
import { createModifierOptionTool } from "./createModifierOption.js"
import { reorderCategoryTool } from "./reorderCategory.js"
import { reorderItemTool } from "./reorderItem.js"
import { scheduleCategoryTool } from "./scheduleCategory.js"
import { setCategoryVisibilityTool } from "./setCategoryVisibility.js"
import { setItemFeaturedTool } from "./setItemFeatured.js"
import { setItemImageTool } from "./setItemImage.js"
import { setItemPriceTool } from "./setItemPrice.js"
import { setItemVisibilityTool } from "./setItemVisibility.js"
import { toggleSpecialInstructionsTool } from "./toggleSpecialInstructions.js"
import { updateBrandConfigTool } from "./updateBrandConfig.js"
import { updateItemTool } from "./updateItem.js"
import { updateItemTagsTool } from "./updateItemTags.js"
import { updatePrepTimeTool } from "./updatePrepTime.js"
import { updateThemeTool } from "./updateTheme.js"

export const assistantMutationTools = {
  add_category: addCategoryTool,
  add_item: addItemTool,
  create_modifier_group: createModifierGroupTool,
  create_modifier_option: createModifierOptionTool,
  reorder_item: reorderItemTool,
  reorder_category: reorderCategoryTool,
  schedule_category: scheduleCategoryTool,
  set_item_visibility: setItemVisibilityTool,
  set_item_featured: setItemFeaturedTool,
  set_item_image: setItemImageTool,
  set_item_price: setItemPriceTool,
  set_category_visibility: setCategoryVisibilityTool,
  toggle_special_instructions: toggleSpecialInstructionsTool,
  update_brand_config: updateBrandConfigTool,
  update_item: updateItemTool,
  update_item_tags: updateItemTagsTool,
  update_prep_time: updatePrepTimeTool,
  update_theme: updateThemeTool,
}
