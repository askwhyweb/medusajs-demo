import { model } from "@medusajs/framework/utils"

const StoreSetting = model.define("store_setting", {
  id: model.id().primaryKey(),
  key: model.text().searchable(),
  scope: model.text().searchable(),
  title: model.text(),
  description: model.text(),
  enabled: model.boolean(),
  sort_order: model.number(),
  payload: model.text(),
})

export default StoreSetting
