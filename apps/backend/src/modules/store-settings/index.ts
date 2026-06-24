import { Module } from "@medusajs/framework/utils"
import StoreSettingsModuleService from "./service"

export const STORE_SETTINGS_MODULE = "store_settings"

export default Module(STORE_SETTINGS_MODULE, {
  service: StoreSettingsModuleService,
})
