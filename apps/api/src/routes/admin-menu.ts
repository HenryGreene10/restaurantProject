import type { Response, Router } from 'express'
import { createTenantDataAccess, createTenantScope } from '@repo/data-access'
import type { TenantRequest } from '../middleware/tenant.js'

type CatalogVisibility = 'AVAILABLE' | 'SOLD_OUT' | 'HIDDEN' | 'SCHEDULED'
type ModifierSelectionType = 'SINGLE' | 'MULTIPLE'

function tenantDataAccessFor(req: TenantRequest) {
  if (!req.tenant) {
    throw new Error('No tenant in request')
  }

  return createTenantDataAccess(createTenantScope(req.tenant.id))
}

function isTenantNotFoundError(error: unknown) {
  return error instanceof Error && error.message.endsWith('not found for tenant')
}

function handleRouteError(res: Response, error: unknown) {
  if (isTenantNotFoundError(error)) {
    return res.status(404).json({ error: error instanceof Error ? error.message : 'Not found' })
  }

  return res.status(400).json({
    error: error instanceof Error ? error.message : 'Invalid request',
  })
}

function parseVisibility(value: unknown): CatalogVisibility | undefined {
  if (
    value === 'AVAILABLE' ||
    value === 'SOLD_OUT' ||
    value === 'HIDDEN' ||
    value === 'SCHEDULED'
  ) {
    return value
  }

  return undefined
}

function parseSelection(value: unknown): ModifierSelectionType | undefined {
  if (value === 'SINGLE' || value === 'MULTIPLE') {
    return value
  }

  return undefined
}

function routeParam(req: TenantRequest, key: string): string {
  const value = req.params[key]
  return Array.isArray(value) ? value[0] : value
}

function parseDaysOfWeek(value: unknown): string[] | null | undefined {
  if (value === null) {
    return null
  }

  if (!Array.isArray(value)) {
    return undefined
  }

  return value.map(String)
}

export function registerAdminMenuRoutes(r: Router) {
  r.get('/admin/menu/categories', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const categories = await tenantDataAccess.menu.listCategories(
        typeof req.query.menuId === 'string' ? req.query.menuId : undefined
      )
      res.json({ categories })
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.post('/admin/menu/categories', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const category = await tenantDataAccess.menu.createCategory({
        menuId: typeof req.body?.menuId === 'string' ? req.body.menuId : undefined,
        name: String(req.body?.name ?? ''),
        sortOrder: typeof req.body?.sortOrder === 'number' ? req.body.sortOrder : 0,
        visibility: parseVisibility(req.body?.visibility) ?? 'AVAILABLE',
        availableFrom: req.body?.availableFrom ? new Date(req.body.availableFrom) : null,
        availableUntil: req.body?.availableUntil ? new Date(req.body.availableUntil) : null,
        daysOfWeek: parseDaysOfWeek(req.body?.daysOfWeek) ?? null,
      })
      res.status(201).json(category)
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.patch('/admin/menu/categories/:categoryId', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const categoryId = routeParam(req, 'categoryId')
      const category = await tenantDataAccess.menu.updateCategory(categoryId, {
        name: typeof req.body?.name === 'string' ? req.body.name : undefined,
        sortOrder: typeof req.body?.sortOrder === 'number' ? req.body.sortOrder : undefined,
        visibility: parseVisibility(req.body?.visibility),
        availableFrom:
          req.body?.availableFrom === null
            ? null
            : req.body?.availableFrom
              ? new Date(req.body.availableFrom)
              : undefined,
        availableUntil:
          req.body?.availableUntil === null
            ? null
            : req.body?.availableUntil
              ? new Date(req.body.availableUntil)
              : undefined,
        daysOfWeek: parseDaysOfWeek(req.body?.daysOfWeek),
      })

      if (!category) {
        return res.status(404).json({ error: 'Category not found' })
      }

      res.json(category)
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.patch('/admin/menu/categories/:categoryId/availability', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const categoryId = routeParam(req, 'categoryId')
      const visibility = parseVisibility(req.body?.visibility)
      if (!visibility) {
        return res.status(400).json({ error: 'Invalid visibility' })
      }

      const category = await tenantDataAccess.menu.setCategoryVisibility(categoryId, visibility)
      if (!category) {
        return res.status(404).json({ error: 'Category not found' })
      }

      res.json(category)
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.patch('/admin/menu/categories/:categoryId/items/reorder', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const categoryId = routeParam(req, 'categoryId')
      const itemIds = Array.isArray(req.body?.itemIds) ? req.body.itemIds.map(String) : null

      if (!itemIds || itemIds.length === 0) {
        return res.status(400).json({ error: 'itemIds must be a non-empty array' })
      }

      const category = await tenantDataAccess.menu.reorderCategoryItems({
        categoryId,
        itemIds,
      })

      return res.json(category)
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.delete('/admin/menu/categories/:categoryId', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const deleted = await tenantDataAccess.menu.deleteCategory(routeParam(req, 'categoryId'))
      if (!deleted) {
        return res.status(404).json({ error: 'Category not found' })
      }

      res.status(204).send()
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.get('/admin/menu/items', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const items = await tenantDataAccess.menu.listItems()
      res.json({ items })
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.post('/admin/menu/items', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const item = await tenantDataAccess.menu.createItem({
        name: String(req.body?.name ?? ''),
        description: req.body?.description ?? null,
        photoUrl: req.body?.photoUrl ?? null,
        basePriceCents: Number(req.body?.basePriceCents ?? 0),
        tags: Array.isArray(req.body?.tags) ? req.body.tags.map(String) : [],
        prepTimeMinutes: Number(req.body?.prepTimeMinutes ?? 0),
        specialInstructionsEnabled: Boolean(req.body?.specialInstructionsEnabled),
        isFeatured: Boolean(req.body?.isFeatured),
        visibility: parseVisibility(req.body?.visibility) ?? 'AVAILABLE',
        categoryIds: Array.isArray(req.body?.categoryIds) ? req.body.categoryIds.map(String) : [],
      })
      res.status(201).json(item)
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.patch('/admin/menu/items/:itemId', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const itemId = routeParam(req, 'itemId')
      const item = await tenantDataAccess.menu.updateItem(itemId, {
        name: typeof req.body?.name === 'string' ? req.body.name : undefined,
        description:
          req.body?.description === null ? null : typeof req.body?.description === 'string' ? req.body.description : undefined,
        photoUrl:
          req.body?.photoUrl === null ? null : typeof req.body?.photoUrl === 'string' ? req.body.photoUrl : undefined,
        basePriceCents: typeof req.body?.basePriceCents === 'number' ? req.body.basePriceCents : undefined,
        tags: Array.isArray(req.body?.tags) ? req.body.tags.map(String) : undefined,
        prepTimeMinutes: typeof req.body?.prepTimeMinutes === 'number' ? req.body.prepTimeMinutes : undefined,
        specialInstructionsEnabled:
          typeof req.body?.specialInstructionsEnabled === 'boolean'
            ? req.body.specialInstructionsEnabled
            : undefined,
        isFeatured: typeof req.body?.isFeatured === 'boolean' ? req.body.isFeatured : undefined,
        visibility: parseVisibility(req.body?.visibility),
        categoryIds: Array.isArray(req.body?.categoryIds) ? req.body.categoryIds.map(String) : undefined,
      })

      if (!item) {
        return res.status(404).json({ error: 'Item not found' })
      }

      res.json(item)
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.patch('/admin/menu/items/:itemId/availability', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const itemId = routeParam(req, 'itemId')
      const visibility = parseVisibility(req.body?.visibility)
      if (!visibility) {
        return res.status(400).json({ error: 'Invalid visibility' })
      }

      const item = await tenantDataAccess.menu.setItemVisibility(itemId, visibility)
      if (!item) {
        return res.status(404).json({ error: 'Item not found' })
      }

      res.json(item)
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.delete('/admin/menu/items/:itemId', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const deleted = await tenantDataAccess.menu.deleteItem(routeParam(req, 'itemId'))
      if (!deleted) {
        return res.status(404).json({ error: 'Item not found' })
      }

      res.status(204).send()
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.get('/admin/menu/variants', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const variants = await tenantDataAccess.menu.listVariants(
        typeof req.query.itemId === 'string' ? req.query.itemId : undefined
      )
      res.json({ variants })
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.post('/admin/menu/variants', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const variant = await tenantDataAccess.menu.createVariant({
        itemId: String(req.body?.itemId ?? ''),
        name: String(req.body?.name ?? ''),
        priceCents: Number(req.body?.priceCents ?? 0),
        isDefault: Boolean(req.body?.isDefault),
      })
      res.status(201).json(variant)
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.patch('/admin/menu/variants/:variantId', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const variantId = routeParam(req, 'variantId')
      const variant = await tenantDataAccess.menu.updateVariant(variantId, {
        itemId: typeof req.body?.itemId === 'string' ? req.body.itemId : undefined,
        name: typeof req.body?.name === 'string' ? req.body.name : undefined,
        priceCents: typeof req.body?.priceCents === 'number' ? req.body.priceCents : undefined,
        isDefault: typeof req.body?.isDefault === 'boolean' ? req.body.isDefault : undefined,
      })

      if (!variant) {
        return res.status(404).json({ error: 'Variant not found' })
      }

      res.json(variant)
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.delete('/admin/menu/variants/:variantId', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const deleted = await tenantDataAccess.menu.deleteVariant(routeParam(req, 'variantId'))
      if (!deleted) {
        return res.status(404).json({ error: 'Variant not found' })
      }

      res.status(204).send()
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.get('/admin/menu/modifier-groups', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const modifierGroups = await tenantDataAccess.menu.listModifierGroups()
      res.json({ modifierGroups })
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.post('/admin/menu/modifier-groups', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const selection = parseSelection(req.body?.selection)
      if (!selection) {
        return res.status(400).json({ error: 'Invalid selection' })
      }

      const modifierGroup = await tenantDataAccess.menu.createModifierGroup({
        name: String(req.body?.name ?? ''),
        selection,
      })
      res.status(201).json(modifierGroup)
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.patch('/admin/menu/modifier-groups/:modifierGroupId', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const modifierGroupId = routeParam(req, 'modifierGroupId')
      const modifierGroup = await tenantDataAccess.menu.updateModifierGroup(modifierGroupId, {
        name: typeof req.body?.name === 'string' ? req.body.name : undefined,
        selection: parseSelection(req.body?.selection),
      })

      if (!modifierGroup) {
        return res.status(404).json({ error: 'Modifier group not found' })
      }

      res.json(modifierGroup)
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.delete('/admin/menu/modifier-groups/:modifierGroupId', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const deleted = await tenantDataAccess.menu.deleteModifierGroup(routeParam(req, 'modifierGroupId'))
      if (!deleted) {
        return res.status(404).json({ error: 'Modifier group not found' })
      }

      res.status(204).send()
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.post('/admin/menu/modifier-groups/:modifierGroupId/options', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const modifierGroupId = routeParam(req, 'modifierGroupId')
      const modifierOption = await tenantDataAccess.menu.createModifierOption({
        groupId: modifierGroupId,
        name: String(req.body?.name ?? ''),
        priceDeltaCents: Number(req.body?.priceDeltaCents ?? 0),
        position: Number(req.body?.position ?? 0),
      })
      res.status(201).json(modifierOption)
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.patch('/admin/menu/modifier-options/:modifierOptionId', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const modifierOptionId = routeParam(req, 'modifierOptionId')
      const modifierOption = await tenantDataAccess.menu.updateModifierOption(modifierOptionId, {
        groupId: typeof req.body?.groupId === 'string' ? req.body.groupId : undefined,
        name: typeof req.body?.name === 'string' ? req.body.name : undefined,
        priceDeltaCents:
          typeof req.body?.priceDeltaCents === 'number' ? req.body.priceDeltaCents : undefined,
        position: typeof req.body?.position === 'number' ? req.body.position : undefined,
      })

      if (!modifierOption) {
        return res.status(404).json({ error: 'Modifier option not found' })
      }

      res.json(modifierOption)
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.delete('/admin/menu/modifier-options/:modifierOptionId', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const deleted = await tenantDataAccess.menu.deleteModifierOption(routeParam(req, 'modifierOptionId'))
      if (!deleted) {
        return res.status(404).json({ error: 'Modifier option not found' })
      }

      res.status(204).send()
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.get('/admin/menu/items/:itemId/modifier-groups', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const itemModifierGroups = await tenantDataAccess.menu.listItemModifierGroups(routeParam(req, 'itemId'))
      res.json({ itemModifierGroups })
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.post('/admin/menu/items/:itemId/modifier-groups', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const itemId = routeParam(req, 'itemId')
      const itemModifierGroup = await tenantDataAccess.menu.attachModifierGroup({
        itemId,
        groupId: String(req.body?.groupId ?? ''),
        isRequired: Boolean(req.body?.isRequired),
        minSelections: Number(req.body?.minSelections ?? 0),
        maxSelections:
          req.body?.maxSelections === null || typeof req.body?.maxSelections === 'number'
            ? req.body.maxSelections
            : null,
        allowOptionQuantity: Boolean(req.body?.allowOptionQuantity),
      })
      res.status(201).json(itemModifierGroup)
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.patch('/admin/menu/item-modifier-groups/:itemModifierGroupId', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const itemModifierGroupId = routeParam(req, 'itemModifierGroupId')
      const itemModifierGroup = await tenantDataAccess.menu.updateItemModifierGroup(
        itemModifierGroupId,
        {
          itemId: typeof req.body?.itemId === 'string' ? req.body.itemId : undefined,
          groupId: typeof req.body?.groupId === 'string' ? req.body.groupId : undefined,
          isRequired: typeof req.body?.isRequired === 'boolean' ? req.body.isRequired : undefined,
          minSelections: typeof req.body?.minSelections === 'number' ? req.body.minSelections : undefined,
          maxSelections:
            req.body?.maxSelections === null || typeof req.body?.maxSelections === 'number'
              ? req.body.maxSelections
              : undefined,
          allowOptionQuantity:
            typeof req.body?.allowOptionQuantity === 'boolean'
              ? req.body.allowOptionQuantity
              : undefined,
        }
      )

      if (!itemModifierGroup) {
        return res.status(404).json({ error: 'Item modifier group not found' })
      }

      res.json(itemModifierGroup)
    } catch (error) {
      handleRouteError(res, error)
    }
  })

  r.delete('/admin/menu/item-modifier-groups/:itemModifierGroupId', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const deleted = await tenantDataAccess.menu.deleteItemModifierGroup(routeParam(req, 'itemModifierGroupId'))
      if (!deleted) {
        return res.status(404).json({ error: 'Item modifier group not found' })
      }

      res.status(204).send()
    } catch (error) {
      handleRouteError(res, error)
    }
  })
}
