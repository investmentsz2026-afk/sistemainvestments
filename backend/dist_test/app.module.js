"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_module_1 = require("./modules/auth/auth.module");
const products_module_1 = require("./modules/products/products.module");
const inventory_module_1 = require("./modules/inventory/inventory.module");
const movements_module_1 = require("./modules/movements/movements.module");
const reports_module_1 = require("./modules/reports/reports.module");
const purchases_module_1 = require("./modules/purchases/purchases.module");
const suppliers_module_1 = require("./modules/suppliers/suppliers.module");
const database_module_1 = require("./database/database.module");
const quality_module_1 = require("./modules/quality/quality.module");
const process_audits_module_1 = require("./modules/process-audits/process-audits.module");
const commercial_module_1 = require("./modules/commercial/commercial.module");
const samples_module_1 = require("./modules/samples/samples.module");
const app_controller_1 = require("./app.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            database_module_1.DatabaseModule,
            auth_module_1.AuthModule,
            products_module_1.ProductsModule,
            inventory_module_1.InventoryModule,
            movements_module_1.MovementsModule,
            reports_module_1.ReportsModule,
            purchases_module_1.PurchasesModule,
            suppliers_module_1.SuppliersModule,
            quality_module_1.QualityModule,
            process_audits_module_1.ProcessAuditsModule,
            commercial_module_1.CommercialModule,
            samples_module_1.SamplesModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [],
    })
], AppModule);
