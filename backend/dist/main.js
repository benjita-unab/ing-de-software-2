/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/app.controller.ts":
/*!*******************************!*\
  !*** ./src/app.controller.ts ***!
  \*******************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AppController = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const app_service_1 = __webpack_require__(/*! ./app.service */ "./src/app.service.ts");
let AppController = class AppController {
    constructor(appService) {
        this.appService = appService;
    }
    health() {
        return this.appService.health();
    }
    getInfo() {
        return this.appService.getInfo();
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "health", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getInfo", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [typeof (_a = typeof app_service_1.AppService !== "undefined" && app_service_1.AppService) === "function" ? _a : Object])
], AppController);


/***/ }),

/***/ "./src/app.module.ts":
/*!***************************!*\
  !*** ./src/app.module.ts ***!
  \***************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AppModule = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
const jwt_1 = __webpack_require__(/*! @nestjs/jwt */ "@nestjs/jwt");
const passport_1 = __webpack_require__(/*! @nestjs/passport */ "@nestjs/passport");
const supabase_config_1 = __webpack_require__(/*! ./config/supabase.config */ "./src/config/supabase.config.ts");
const resend_config_1 = __webpack_require__(/*! ./config/resend.config */ "./src/config/resend.config.ts");
const jwt_strategy_1 = __webpack_require__(/*! ./common/strategies/jwt.strategy */ "./src/common/strategies/jwt.strategy.ts");
const app_controller_1 = __webpack_require__(/*! ./app.controller */ "./src/app.controller.ts");
const app_service_1 = __webpack_require__(/*! ./app.service */ "./src/app.service.ts");
const conductores_module_1 = __webpack_require__(/*! ./modules/conductores/conductores.module */ "./src/modules/conductores/conductores.module.ts");
const rutas_module_1 = __webpack_require__(/*! ./modules/rutas/rutas.module */ "./src/modules/rutas/rutas.module.ts");
const entregas_module_1 = __webpack_require__(/*! ./modules/entregas/entregas.module */ "./src/modules/entregas/entregas.module.ts");
const incidencias_module_1 = __webpack_require__(/*! ./modules/incidencias/incidencias.module */ "./src/modules/incidencias/incidencias.module.ts");
const email_module_1 = __webpack_require__(/*! ./modules/email/email.module */ "./src/modules/email/email.module.ts");
const storage_module_1 = __webpack_require__(/*! ./modules/storage/storage.module */ "./src/modules/storage/storage.module.ts");
const trazabilidad_module_1 = __webpack_require__(/*! ./modules/trazabilidad/trazabilidad.module */ "./src/modules/trazabilidad/trazabilidad.module.ts");
const auth_module_1 = __webpack_require__(/*! ./modules/auth/auth.module */ "./src/modules/auth/auth.module.ts");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            passport_1.PassportModule,
            jwt_1.JwtModule.register({
                secret: process.env.SUPABASE_PUBLIC_KEY,
                signOptions: { expiresIn: '24h' },
            }),
            auth_module_1.AuthModule,
            conductores_module_1.ConductoresModule,
            rutas_module_1.RutasModule,
            entregas_module_1.EntregasModule,
            incidencias_module_1.IncidenciasModule,
            email_module_1.EmailModule,
            storage_module_1.StorageModule,
            trazabilidad_module_1.TrazabilidadModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService, supabase_config_1.SupabaseConfigService, resend_config_1.ResendConfigService, jwt_strategy_1.JwtStrategy],
        exports: [supabase_config_1.SupabaseConfigService, resend_config_1.ResendConfigService],
    })
], AppModule);


/***/ }),

/***/ "./src/app.service.ts":
/*!****************************!*\
  !*** ./src/app.service.ts ***!
  \****************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AppService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
let AppService = class AppService {
    health() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
        };
    }
    getInfo() {
        return {
            name: 'LogiTrack Backend API',
            version: '1.0.0',
            description: 'Backend centralizado para sistema de logística',
            modules: ['conductores', 'rutas', 'entregas'],
            endpoints: {
                conductores: '/api/conductores',
                rutas: '/api/rutas',
                entregas: '/api/entregas',
            },
        };
    }
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)()
], AppService);


/***/ }),

/***/ "./src/common/decorators/user.decorator.ts":
/*!*************************************************!*\
  !*** ./src/common/decorators/user.decorator.ts ***!
  \*************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CurrentUser = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
exports.CurrentUser = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
        return null;
    }
    // Si data especifica un campo, devuelve solo ese campo
    return data ? user?.[data] : user;
});


/***/ }),

/***/ "./src/common/guards/jwt.guard.ts":
/*!****************************************!*\
  !*** ./src/common/guards/jwt.guard.ts ***!
  \****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JwtGuard = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const passport_1 = __webpack_require__(/*! @nestjs/passport */ "@nestjs/passport");
let JwtGuard = class JwtGuard extends (0, passport_1.AuthGuard)('jwt') {
    canActivate(context) {
        return super.canActivate(context);
    }
    handleRequest(err, user, info) {
        if (err || !user) {
            throw err || new common_1.UnauthorizedException('Token inválido o expirado');
        }
        return user;
    }
};
exports.JwtGuard = JwtGuard;
exports.JwtGuard = JwtGuard = __decorate([
    (0, common_1.Injectable)()
], JwtGuard);


/***/ }),

/***/ "./src/common/strategies/jwt.strategy.ts":
/*!***********************************************!*\
  !*** ./src/common/strategies/jwt.strategy.ts ***!
  \***********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JwtStrategy = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
const passport_1 = __webpack_require__(/*! @nestjs/passport */ "@nestjs/passport");
const passport_jwt_1 = __webpack_require__(/*! passport-jwt */ "passport-jwt");
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    constructor(configService) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get('JWT_SECRET'),
            algorithms: ['HS256'],
        });
    }
    validate(payload) {
        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role || payload.user_role || 'user',
            aud: payload.aud,
            iss: payload.iss,
        };
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object])
], JwtStrategy);


/***/ }),

/***/ "./src/config/resend.config.ts":
/*!*************************************!*\
  !*** ./src/config/resend.config.ts ***!
  \*************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ResendConfigService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const resend_1 = __webpack_require__(/*! resend */ "resend");
let ResendConfigService = class ResendConfigService {
    constructor() {
        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
            throw new Error('RESEND_API_KEY must be defined in environment variables');
        }
        this.resendClient = new resend_1.Resend(resendApiKey);
    }
    getClient() {
        return this.resendClient;
    }
    async sendEmail(to, subject, html, attachments) {
        try {
            const response = await this.resendClient.emails.send({
                from: process.env.RESEND_FROM_EMAIL || 'Sistema LogiTrack <onboarding@resend.dev>',
                to,
                subject,
                html,
                attachments,
            });
            return response;
        }
        catch (error) {
            throw new Error(`Email error: ${error?.message}`);
        }
    }
    async sendEmailWithAttachment(to, subject, html, attachmentBase64, attachmentName) {
        try {
            const response = await this.resendClient.emails.send({
                from: process.env.RESEND_FROM_EMAIL || 'Sistema LogiTrack <onboarding@resend.dev>',
                to,
                subject,
                html,
                attachments: [
                    {
                        filename: attachmentName,
                        content: attachmentBase64,
                    },
                ],
            });
            return response;
        }
        catch (error) {
            throw new Error(`Email with attachment error: ${error?.message}`);
        }
    }
};
exports.ResendConfigService = ResendConfigService;
exports.ResendConfigService = ResendConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ResendConfigService);


/***/ }),

/***/ "./src/config/supabase.config.ts":
/*!***************************************!*\
  !*** ./src/config/supabase.config.ts ***!
  \***************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SupabaseConfigService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const supabase_js_1 = __webpack_require__(/*! @supabase/supabase-js */ "@supabase/supabase-js");
let SupabaseConfigService = class SupabaseConfigService {
    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseServiceRoleKey) {
            throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in environment variables');
        }
        this.supabaseClient = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceRoleKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });
    }
    getClient() {
        return this.supabaseClient;
    }
    // Métodos de utilidad
    async uploadFile(bucket, path, file, contentType) {
        const { data, error } = await this.supabaseClient.storage
            .from(bucket)
            .upload(path, file, {
            contentType,
            upsert: false,
        });
        if (error) {
            throw new Error(`Storage error: ${error.message}`);
        }
        return data;
    }
    getPublicUrl(bucket, path) {
        const { data } = this.supabaseClient.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
    }
    async deleteFile(bucket, path) {
        const { error } = await this.supabaseClient.storage.from(bucket).remove([path]);
        if (error) {
            throw new Error(`Delete error: ${error.message}`);
        }
    }
};
exports.SupabaseConfigService = SupabaseConfigService;
exports.SupabaseConfigService = SupabaseConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], SupabaseConfigService);


/***/ }),

/***/ "./src/main.ts":
/*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const core_1 = __webpack_require__(/*! @nestjs/core */ "@nestjs/core");
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const app_module_1 = __webpack_require__(/*! ./app.module */ "./src/app.module.ts");
const helmet_1 = __importDefault(__webpack_require__(/*! helmet */ "helmet"));
const compression_1 = __importDefault(__webpack_require__(/*! compression */ "compression"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['log', 'error', 'warn', 'debug'],
    });
    app.use((req, _res, next) => {
        console.log(`[REQ] ${req.method} ${req.url}`);
        next();
    });
    // Security
    app.use((0, helmet_1.default)());
    app.use((0, compression_1.default)());
    // CORS
    app.enableCors({
        origin: [
            'http://localhost:3000',
            'http://localhost:19006',
            process.env.FRONTEND_URL || '*',
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    // Global validation
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`✅ Backend iniciado en http://localhost:${port}`);
}
bootstrap().catch((err) => {
    console.error('❌ Error iniciando la aplicación:', err);
    process.exit(1);
});


/***/ }),

/***/ "./src/modules/auth/auth.controller.ts":
/*!*********************************************!*\
  !*** ./src/modules/auth/auth.controller.ts ***!
  \*********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthController = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const auth_service_1 = __webpack_require__(/*! ./auth.service */ "./src/modules/auth/auth.service.ts");
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    /**
     * POST /api/auth/login
     * Body: { email, password }
     * Respuesta: { accessToken }
     */
    async login(body) {
        if (!body?.email || !body?.password) {
            throw new common_1.BadRequestException('email y password son requeridos');
        }
        return this.authService.login(body.email, body.password);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('api/auth'),
    __metadata("design:paramtypes", [typeof (_a = typeof auth_service_1.AuthService !== "undefined" && auth_service_1.AuthService) === "function" ? _a : Object])
], AuthController);


/***/ }),

/***/ "./src/modules/auth/auth.module.ts":
/*!*****************************************!*\
  !*** ./src/modules/auth/auth.module.ts ***!
  \*****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthModule = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
const jwt_1 = __webpack_require__(/*! @nestjs/jwt */ "@nestjs/jwt");
const auth_controller_1 = __webpack_require__(/*! ./auth.controller */ "./src/modules/auth/auth.controller.ts");
const auth_service_1 = __webpack_require__(/*! ./auth.service */ "./src/modules/auth/auth.service.ts");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    secret: config.get('JWT_SECRET'),
                    signOptions: { expiresIn: '24h' },
                }),
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService],
        exports: [auth_service_1.AuthService],
    })
], AuthModule);


/***/ }),

/***/ "./src/modules/auth/auth.service.ts":
/*!******************************************!*\
  !*** ./src/modules/auth/auth.service.ts ***!
  \******************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const config_1 = __webpack_require__(/*! @nestjs/config */ "@nestjs/config");
const jwt_1 = __webpack_require__(/*! @nestjs/jwt */ "@nestjs/jwt");
let AuthService = class AuthService {
    constructor(jwtService, configService) {
        this.jwtService = jwtService;
        this.configService = configService;
    }
    /**
     * Valida credenciales contra DEBUG_EMAIL / DEBUG_PASSWORD del .env
     * y emite un JWT firmado con JWT_SECRET.
     */
    async login(email, password) {
        const debugEmail = this.configService.get('DEBUG_EMAIL');
        const debugPassword = this.configService.get('DEBUG_PASSWORD');
        if (!debugEmail || !debugPassword) {
            throw new common_1.UnauthorizedException('Credenciales de depuración no configuradas en el servidor');
        }
        if (email !== debugEmail || password !== debugPassword) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        const payload = {
            sub: email,
            email,
            role: 'mobile',
        };
        const accessToken = await this.jwtService.signAsync(payload);
        return { accessToken };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof jwt_1.JwtService !== "undefined" && jwt_1.JwtService) === "function" ? _a : Object, typeof (_b = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _b : Object])
], AuthService);


/***/ }),

/***/ "./src/modules/conductores/conductores.controller.ts":
/*!***********************************************************!*\
  !*** ./src/modules/conductores/conductores.controller.ts ***!
  \***********************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ConductoresController = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const platform_express_1 = __webpack_require__(/*! @nestjs/platform-express */ "@nestjs/platform-express");
const multer_1 = __webpack_require__(/*! multer */ "multer");
const conductores_service_1 = __webpack_require__(/*! ./conductores.service */ "./src/modules/conductores/conductores.service.ts");
const jwt_guard_1 = __webpack_require__(/*! ../../common/guards/jwt.guard */ "./src/common/guards/jwt.guard.ts");
const user_decorator_1 = __webpack_require__(/*! ../../common/decorators/user.decorator */ "./src/common/decorators/user.decorator.ts");
let ConductoresController = class ConductoresController {
    constructor(conductoresService) {
        this.conductoresService = conductoresService;
    }
    /**
     * POST /api/conductores/upload-license
     * Sube la licencia de un conductor
     */
    async uploadLicense(userId, file, body) {
        if (!file) {
            throw new common_1.BadRequestException('El archivo es requerido');
        }
        if (!body?.expiryDate) {
            throw new common_1.BadRequestException('expiryDate es requerido');
        }
        return await this.conductoresService.uploadDriverLicense(userId, file, body.expiryDate);
    }
    /**
     * GET /api/conductores/:id/license-status
     * Obtiene el estado de la licencia de un conductor
     */
    async getLicenseStatus(conductorId) {
        return await this.conductoresService.validateDriverLicense(conductorId);
    }
    /**
     * GET /api/conductores/:id
     * Obtiene información detallada de un conductor
     */
    async getDriverInfo(conductorId) {
        return await this.conductoresService.getDriverInfo(conductorId);
    }
    /**
     * GET /api/conductores
     * Lista todos los conductores activos
     */
    async listActiveDrivers() {
        return await this.conductoresService.listActiveDrivers();
    }
};
exports.ConductoresController = ConductoresController;
__decorate([
    (0, common_1.Post)('upload-license'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)() })),
    __param(0, (0, user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_c = typeof Express !== "undefined" && (_b = Express.Multer) !== void 0 && _b.File) === "function" ? _c : Object, Object]),
    __metadata("design:returntype", Promise)
], ConductoresController.prototype, "uploadLicense", null);
__decorate([
    (0, common_1.Get)(':id/license-status'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ConductoresController.prototype, "getLicenseStatus", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ConductoresController.prototype, "getDriverInfo", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ConductoresController.prototype, "listActiveDrivers", null);
exports.ConductoresController = ConductoresController = __decorate([
    (0, common_1.Controller)('api/conductores'),
    __metadata("design:paramtypes", [typeof (_a = typeof conductores_service_1.ConductoresService !== "undefined" && conductores_service_1.ConductoresService) === "function" ? _a : Object])
], ConductoresController);


/***/ }),

/***/ "./src/modules/conductores/conductores.module.ts":
/*!*******************************************************!*\
  !*** ./src/modules/conductores/conductores.module.ts ***!
  \*******************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ConductoresModule = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const conductores_service_1 = __webpack_require__(/*! ./conductores.service */ "./src/modules/conductores/conductores.service.ts");
const conductores_controller_1 = __webpack_require__(/*! ./conductores.controller */ "./src/modules/conductores/conductores.controller.ts");
const supabase_config_1 = __webpack_require__(/*! ../../config/supabase.config */ "./src/config/supabase.config.ts");
let ConductoresModule = class ConductoresModule {
};
exports.ConductoresModule = ConductoresModule;
exports.ConductoresModule = ConductoresModule = __decorate([
    (0, common_1.Module)({
        providers: [conductores_service_1.ConductoresService, supabase_config_1.SupabaseConfigService],
        controllers: [conductores_controller_1.ConductoresController],
        exports: [conductores_service_1.ConductoresService],
    })
], ConductoresModule);


/***/ }),

/***/ "./src/modules/conductores/conductores.service.ts":
/*!********************************************************!*\
  !*** ./src/modules/conductores/conductores.service.ts ***!
  \********************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ConductoresService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const supabase_config_1 = __webpack_require__(/*! ../../config/supabase.config */ "./src/config/supabase.config.ts");
let ConductoresService = class ConductoresService {
    constructor(supabaseConfig) {
        this.supabaseConfig = supabaseConfig;
        this.ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
        this.MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    }
    /**
     * Valida si la licencia de un conductor es vigente
     * @param conductorId - ID del conductor
     * @returns Objeto con estado de validación
     */
    async validateDriverLicense(conductorId) {
        if (!conductorId) {
            throw new common_1.BadRequestException('ID del conductor es requerido');
        }
        const supabase = this.supabaseConfig.getClient();
        // Consultar datos del conductor
        const { data: conductor, error } = await supabase
            .from('conductores')
            .select('id, usuario_id, rut, licencia_numero, licencia_vencimiento, activo')
            .eq('id', conductorId)
            .single();
        if (error) {
            throw new common_1.NotFoundException(`Conductor no encontrado: ${error.message}`);
        }
        if (!conductor) {
            throw new common_1.NotFoundException('Conductor no encontrado');
        }
        // Validar que el conductor esté activo
        if (!conductor.activo) {
            return {
                isValid: false,
                status: 'INACTIVE',
                message: 'El conductor no está activo en el sistema',
            };
        }
        // Validar que tenga licencia registrada
        if (!conductor.licencia_vencimiento) {
            return {
                isValid: false,
                status: 'NO_LICENSE',
                message: 'El conductor no tiene licencia registrada',
            };
        }
        // Comparar fecha de vencimiento con fecha actual
        const fechaVencimiento = new Date(conductor.licencia_vencimiento);
        const hoy = new Date();
        fechaVencimiento.setHours(0, 0, 0, 0);
        hoy.setHours(0, 0, 0, 0);
        if (hoy > fechaVencimiento) {
            return {
                isValid: false,
                status: 'EXPIRED',
                message: 'La licencia del conductor se encuentra vencida',
                expiryDate: conductor.licencia_vencimiento,
            };
        }
        // Verificar si está próxima a vencer (30 días)
        const diasParaVencer = Math.floor((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        if (diasParaVencer < 30) {
            return {
                isValid: true,
                status: 'EXPIRING_SOON',
                message: `Licencia vigente pero vence en ${diasParaVencer} días`,
                expiryDate: conductor.licencia_vencimiento,
                daysUntilExpiry: diasParaVencer,
            };
        }
        return {
            isValid: true,
            status: 'VALID',
            message: 'Licencia vigente',
            expiryDate: conductor.licencia_vencimiento,
            daysUntilExpiry: diasParaVencer,
        };
    }
    /**
     * Sube una licencia de conducir al storage y registra en la BD
     * @param userId - ID del usuario
     * @param file - Archivo subido
     * @param expiryDate - Fecha de vencimiento
     */
    async uploadDriverLicense(userId, file, expiryDate) {
        if (!userId || !file || !expiryDate) {
            throw new common_1.BadRequestException('userId, file y expiryDate son requeridos');
        }
        // Validar archivo
        this.validateFile(file);
        // Validar fecha
        this.validateExpiryDate(expiryDate);
        const supabase = this.supabaseConfig.getClient();
        const bucket = process.env.SUPABASE_DRIVER_LICENSES_BUCKET || 'driver_licenses';
        // Generar path único para el archivo
        const fileName = `${Date.now()}_${file.originalname}`;
        const filePath = `licenses/${userId}/${fileName}`;
        if (!file.buffer) {
            throw new common_1.BadRequestException('El archivo no se cargó correctamente en memoria');
        }
        try {
            // 1. Subir archivo a Supabase Storage
            await this.supabaseConfig.uploadFile(bucket, filePath, file.buffer, file.mimetype);
            // 2. Obtener URL pública
            const publicUrl = this.supabaseConfig.getPublicUrl(bucket, filePath);
            // 3. Guardar registro en driver_licenses
            const { data: licenseRecord, error: insertError } = await supabase
                .from('driver_licenses')
                .insert([
                {
                    user_id: userId,
                    file_url: publicUrl,
                    file_name: file.originalname,
                    expiry_date: expiryDate,
                    uploaded_at: new Date().toISOString(),
                    status: 'pending_review',
                },
            ])
                .select();
            if (insertError) {
                throw new common_1.BadRequestException(`Error al guardar registro: ${insertError.message}`);
            }
            return {
                success: true,
                message: 'Licencia subida exitosamente',
                data: {
                    licenseId: licenseRecord?.[0]?.id,
                    fileUrl: publicUrl,
                    status: 'pending_review',
                    expiryDate,
                },
            };
        }
        catch (error) {
            try {
                await this.supabaseConfig.deleteFile(bucket, filePath);
            }
            catch {
                // Ignorar errores de limpieza para no enmascarar el error original
            }
            throw error;
        }
    }
    /**
     * Obtiene información del conductor y estado de su licencia
     */
    async getDriverInfo(conductorId) {
        if (!conductorId) {
            throw new common_1.BadRequestException('ID del conductor es requerido');
        }
        const supabase = this.supabaseConfig.getClient();
        const { data: conductor, error } = await supabase
            .from('conductores')
            .select(`
        id,
        usuario_id,
        rut,
        licencia_numero,
        licencia_vencimiento,
        telefono,
        activo
      `)
            .eq('id', conductorId)
            .single();
        if (error) {
            throw new common_1.NotFoundException(`Conductor no encontrado: ${error.message}`);
        }
        // Obtener licencias del conductor
        const { data: licenses } = await supabase
            .from('driver_licenses')
            .select('*')
            .eq('user_id', conductor.usuario_id)
            .order('uploaded_at', { ascending: false });
        return {
            conductor,
            licenses: licenses || [],
            licenseStatus: await this.validateDriverLicense(conductorId),
        };
    }
    /**
     * Lista conductores activos
     */
    async listActiveDrivers() {
        const supabase = this.supabaseConfig.getClient();
        const { data: conductores, error } = await supabase
            .from('conductores')
            .select(`
        id,
        rut,
        licencia_numero,
        licencia_vencimiento,
        telefono,
        activo
      `)
            .eq('activo', true)
            .order('created_at', { ascending: false });
        if (error) {
            throw new common_1.BadRequestException(`Error al obtener conductores: ${error.message}`);
        }
        // Enriquecer con estado de licencia
        const conductoresWithStatus = await Promise.all((conductores || []).map(async (conductor) => ({
            ...conductor,
            licenseStatus: await this.validateDriverLicense(conductor.id),
        })));
        return conductoresWithStatus;
    }
    // ========== HELPERS PRIVADOS ==========
    /**
     * Valida el archivo subido
     */
    validateFile(file) {
        if (!file) {
            throw new common_1.BadRequestException('Debes seleccionar un archivo');
        }
        if (!this.ALLOWED_FILE_TYPES.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Formato no permitido. Acepta: PDF, JPG, PNG');
        }
        if (file.size > this.MAX_FILE_SIZE) {
            throw new common_1.BadRequestException('El archivo excede 5MB');
        }
    }
    /**
     * Valida la fecha de vencimiento
     */
    validateExpiryDate(dateStr) {
        if (!dateStr) {
            throw new common_1.BadRequestException('Debes seleccionar una fecha de vencimiento');
        }
        const selectedDate = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
            throw new common_1.BadRequestException('La fecha debe ser posterior a hoy');
        }
    }
};
exports.ConductoresService = ConductoresService;
exports.ConductoresService = ConductoresService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof supabase_config_1.SupabaseConfigService !== "undefined" && supabase_config_1.SupabaseConfigService) === "function" ? _a : Object])
], ConductoresService);


/***/ }),

/***/ "./src/modules/email/email.controller.ts":
/*!***********************************************!*\
  !*** ./src/modules/email/email.controller.ts ***!
  \***********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EmailController = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const email_service_1 = __webpack_require__(/*! ./email.service */ "./src/modules/email/email.service.ts");
const jwt_guard_1 = __webpack_require__(/*! ../../common/guards/jwt.guard */ "./src/common/guards/jwt.guard.ts");
let EmailController = class EmailController {
    constructor(emailService) {
        this.emailService = emailService;
    }
    /**
     * POST /api/email/enviar-qr
     * Genera y envía el código QR al cliente por correo.
     */
    async enviarQR(body) {
        return await this.emailService.enviarQR(body.email, body.clienteId, body.nombreCliente);
    }
};
exports.EmailController = EmailController;
__decorate([
    (0, common_1.Post)('enviar-qr'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "enviarQR", null);
exports.EmailController = EmailController = __decorate([
    (0, common_1.Controller)('api/email'),
    __metadata("design:paramtypes", [typeof (_a = typeof email_service_1.EmailService !== "undefined" && email_service_1.EmailService) === "function" ? _a : Object])
], EmailController);


/***/ }),

/***/ "./src/modules/email/email.module.ts":
/*!*******************************************!*\
  !*** ./src/modules/email/email.module.ts ***!
  \*******************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EmailModule = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const email_controller_1 = __webpack_require__(/*! ./email.controller */ "./src/modules/email/email.controller.ts");
const email_service_1 = __webpack_require__(/*! ./email.service */ "./src/modules/email/email.service.ts");
const resend_config_1 = __webpack_require__(/*! ../../config/resend.config */ "./src/config/resend.config.ts");
let EmailModule = class EmailModule {
};
exports.EmailModule = EmailModule;
exports.EmailModule = EmailModule = __decorate([
    (0, common_1.Module)({
        providers: [email_service_1.EmailService, resend_config_1.ResendConfigService],
        controllers: [email_controller_1.EmailController],
        exports: [email_service_1.EmailService],
    })
], EmailModule);


/***/ }),

/***/ "./src/modules/email/email.service.ts":
/*!********************************************!*\
  !*** ./src/modules/email/email.service.ts ***!
  \********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EmailService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const resend_config_1 = __webpack_require__(/*! ../../config/resend.config */ "./src/config/resend.config.ts");
let EmailService = class EmailService {
    constructor(resendConfig) {
        this.resendConfig = resendConfig;
    }
    async enviarQR(email, clienteId, nombreCliente) {
        if (!email?.trim()) {
            throw new common_1.BadRequestException('email es requerido');
        }
        if (!clienteId?.trim()) {
            throw new common_1.BadRequestException('clienteId es requerido');
        }
        if (!nombreCliente?.trim()) {
            throw new common_1.BadRequestException('nombreCliente es requerido');
        }
        const nombreSeguro = this.escapeHtml(nombreCliente.trim());
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(clienteId.trim())}`;
        const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; padding: 24px; color: #111827;">
          <h1 style="color: #1565c0;">Hola, ${nombreSeguro}</h1>
          <p>Aquí está tu código QR para presentar a la hora de la recepción de carga:</p>
          <div style="margin: 24px 0;">
            <img src="${qrUrl}" alt="Código QR" style="border: 1px solid #E5E7EB; border-radius: 8px;" />
          </div>
          <p style="color: #6B7280;">Slds,<br/>LogiTrack</p>
        </body>
      </html>
    `;
        try {
            await this.resendConfig.sendEmail(email.trim(), `Código QR para Entrega - ${nombreSeguro}`, html);
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(`Error al enviar QR por email: ${error?.message}`);
        }
        return { message: 'QR enviado correctamente' };
    }
    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof resend_config_1.ResendConfigService !== "undefined" && resend_config_1.ResendConfigService) === "function" ? _a : Object])
], EmailService);


/***/ }),

/***/ "./src/modules/entregas/entregas.controller.ts":
/*!*****************************************************!*\
  !*** ./src/modules/entregas/entregas.controller.ts ***!
  \*****************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EntregasController = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const entregas_service_1 = __webpack_require__(/*! ./entregas.service */ "./src/modules/entregas/entregas.service.ts");
const jwt_guard_1 = __webpack_require__(/*! ../../common/guards/jwt.guard */ "./src/common/guards/jwt.guard.ts");
const user_decorator_1 = __webpack_require__(/*! ../../common/decorators/user.decorator */ "./src/common/decorators/user.decorator.ts");
let EntregasController = class EntregasController {
    constructor(entregasService) {
        this.entregasService = entregasService;
    }
    /**
     * POST /api/entregas/:rutaId/close
     * Cierra una entrega (genera PDF, envía email, marca como validada)
     */
    async closeDelivery(rutaId, userEmail, body) {
        // TEMP LOG
        console.log('CLOSE DELIVERY -> rutaId:', rutaId, 'body:', body);
        return await this.entregasService.closeDelivery(rutaId, body?.clienteEmail || userEmail);
    }
    /**
     * POST /api/entregas/:rutaId/signature
     * Guarda la firma de recepción (base64)
     */
    async saveSignature(rutaId, body) {
        // TEMP LOG
        console.log('SAVE SIGNATURE -> rutaId:', rutaId, 'base64Signature length:', body?.base64Signature?.length ?? 0);
        return await this.entregasService.saveSignature(rutaId, body.base64Signature);
    }
    /**
     * POST /api/entregas/:rutaId/photo
     * Guarda la foto de la ficha de despacho (base64)
     */
    async savePhoto(rutaId, body) {
        return await this.entregasService.savePhoto(rutaId, body.base64Photo);
    }
    /**
     * GET /api/entregas/:rutaId
     * Obtiene el estado de una entrega
     */
    async getDeliveryStatus(rutaId) {
        return await this.entregasService.getDeliveryStatus(rutaId);
    }
};
exports.EntregasController = EntregasController;
__decorate([
    (0, common_1.Post)(':rutaId/close'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Param)('rutaId')),
    __param(1, (0, user_decorator_1.CurrentUser)('email')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EntregasController.prototype, "closeDelivery", null);
__decorate([
    (0, common_1.Post)(':rutaId/signature'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Param)('rutaId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EntregasController.prototype, "saveSignature", null);
__decorate([
    (0, common_1.Post)(':rutaId/photo'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Param)('rutaId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EntregasController.prototype, "savePhoto", null);
__decorate([
    (0, common_1.Get)(':rutaId'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Param)('rutaId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EntregasController.prototype, "getDeliveryStatus", null);
exports.EntregasController = EntregasController = __decorate([
    (0, common_1.Controller)('api/entregas'),
    __metadata("design:paramtypes", [typeof (_a = typeof entregas_service_1.EntregasService !== "undefined" && entregas_service_1.EntregasService) === "function" ? _a : Object])
], EntregasController);


/***/ }),

/***/ "./src/modules/entregas/entregas.module.ts":
/*!*************************************************!*\
  !*** ./src/modules/entregas/entregas.module.ts ***!
  \*************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EntregasModule = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const entregas_service_1 = __webpack_require__(/*! ./entregas.service */ "./src/modules/entregas/entregas.service.ts");
const entregas_controller_1 = __webpack_require__(/*! ./entregas.controller */ "./src/modules/entregas/entregas.controller.ts");
const supabase_config_1 = __webpack_require__(/*! ../../config/supabase.config */ "./src/config/supabase.config.ts");
const resend_config_1 = __webpack_require__(/*! ../../config/resend.config */ "./src/config/resend.config.ts");
let EntregasModule = class EntregasModule {
};
exports.EntregasModule = EntregasModule;
exports.EntregasModule = EntregasModule = __decorate([
    (0, common_1.Module)({
        providers: [entregas_service_1.EntregasService, supabase_config_1.SupabaseConfigService, resend_config_1.ResendConfigService],
        controllers: [entregas_controller_1.EntregasController],
        exports: [entregas_service_1.EntregasService],
    })
], EntregasModule);


/***/ }),

/***/ "./src/modules/entregas/entregas.service.ts":
/*!**************************************************!*\
  !*** ./src/modules/entregas/entregas.service.ts ***!
  \**************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EntregasService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const supabase_config_1 = __webpack_require__(/*! ../../config/supabase.config */ "./src/config/supabase.config.ts");
const resend_config_1 = __webpack_require__(/*! ../../config/resend.config */ "./src/config/resend.config.ts");
const pdfkit_1 = __importDefault(__webpack_require__(/*! pdfkit */ "pdfkit"));
let EntregasService = class EntregasService {
    constructor(supabaseConfig, resendConfig) {
        this.supabaseConfig = supabaseConfig;
        this.resendConfig = resendConfig;
    }
    /**
     * Cierra una entrega: genera PDF, envía email y marca como validada
     */
    async closeDelivery(rutaId, clienteEmail) {
        if (!rutaId) {
            throw new common_1.BadRequestException('rutaId es requerido');
        }
        const supabase = this.supabaseConfig.getClient();
        // Obtener información de la ruta
        const { data: ruta, error: rutaError } = await supabase
            .from('rutas')
            .select(`
        id,
        fecha_inicio,
        fecha_fin,
        origen,
        destino,
        clientes(id, nombre, contacto_email),
        conductores(rut),
        camiones(patente)
      `)
            .eq('id', rutaId)
            .single();
        if (rutaError || !ruta) {
            throw new common_1.NotFoundException(`Ruta no encontrada: ${rutaError?.message}`);
        }
        const cliente = Array.isArray(ruta.clientes) ? ruta.clientes[0] : ruta.clientes;
        // Obtener entregas asociadas
        const { data: entregas, error: entregasError } = await supabase
            .from('entregas')
            .select('id, token_verificacion, codigo_otp')
            .eq('ruta_id', rutaId);
        if (entregasError) {
            throw new common_1.BadRequestException(`Error al obtener entregas: ${entregasError.message}`);
        }
        try {
            // 0. Obtener firma del receptor (más reciente) desde BD
            const { data: entregasFirma, error: firmaError } = await supabase
                .from('entregas')
                .select('firma_url, created_at')
                .eq('ruta_id', rutaId)
                .not('firma_url', 'is', null)
                .order('created_at', { ascending: false });
            if (firmaError) {
                console.error('Error consultando firma:', firmaError);
            }
            const firmaUrl = entregasFirma?.[0]?.firma_url ?? null;
            // TEMP LOG
            console.log('PDF -> firmaUrl:', firmaUrl);
            if (!firmaUrl) {
                console.warn('⚠️ No hay firma_url en la BD al generar PDF');
            }
            // Descargar firma desde el bucket fotos_trazabilidad usando service_role
            let firmaBuffer = null;
            if (firmaUrl) {
                const marker = '/storage/v1/object/public/fotos_trazabilidad/';
                const filePath = firmaUrl.includes(marker)
                    ? firmaUrl.split(marker)[1]
                    : null;
                if (!filePath) {
                    console.warn(`⚠️ firma_url no apunta a fotos_trazabilidad: ${firmaUrl}`);
                }
                else {
                    console.log('Descargando firma desde fotos_trazabilidad:', filePath);
                    const { data: firmaBlob, error: downloadError } = await supabase.storage
                        .from('fotos_trazabilidad')
                        .download(filePath);
                    if (downloadError) {
                        console.error('Error descargando firma desde fotos_trazabilidad:', downloadError);
                    }
                    else if (firmaBlob) {
                        const arrayBuffer = await firmaBlob.arrayBuffer();
                        console.log('Firma descargada, bytes:', arrayBuffer.byteLength);
                        firmaBuffer = Buffer.from(arrayBuffer);
                    }
                }
            }
            // 1. Generar PDF
            const pdfBuffer = await this.generateDeliveryPDF({
                rutaId: ruta.id,
                origen: ruta.origen,
                destino: ruta.destino,
                fechaInicio: ruta.fecha_inicio,
                fechaFin: ruta.fecha_fin,
                cliente,
                conductor: ruta.conductores,
                camion: ruta.camiones,
                firmaBuffer,
            });
            // 2. Subir PDF a Storage
            const pdfPath = `comprobantes/${rutaId}/${Date.now()}.pdf`;
            const { error: uploadError } = await supabase.storage
                .from('entregas')
                .upload(pdfPath, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: false,
            });
            if (uploadError) {
                throw new common_1.InternalServerErrorException(`Error al subir PDF: ${uploadError.message}`);
            }
            // Obtener URL pública
            const { data: publicUrlData } = supabase.storage
                .from('entregas')
                .getPublicUrl(pdfPath);
            // 3. Enviar email al cliente
            const emailDestino = clienteEmail || cliente?.contacto_email;
            if (emailDestino) {
                await this.sendDeliveryEmail(emailDestino, cliente?.nombre || 'Cliente', pdfBuffer, rutaId);
            }
            // 4. Marcar entregas como validadas
            const { error: updateError } = await supabase
                .from('entregas')
                .update({
                validado: true,
                fecha_entrega_real: new Date().toISOString(),
                estado: 'ENTREGADA',
            })
                .eq('ruta_id', rutaId);
            if (updateError) {
                console.warn(`No se pudieron marcar entregas como validadas: ${updateError.message}`);
            }
            // 5. Cambiar estado de ruta
            await supabase
                .from('rutas')
                .update({ estado: 'ENTREGADA', fecha_fin: new Date().toISOString() })
                .eq('id', rutaId);
            return {
                success: true,
                message: 'Entrega cerrada exitosamente',
                data: {
                    rutaId,
                    pdfUrl: publicUrlData.publicUrl,
                    emailEnviadoA: emailDestino,
                    clienteNombre: cliente?.nombre,
                },
            };
        }
        catch (error) {
            // TEMP LOG
            console.error('ERROR CLOSE DELIVERY:', error);
            throw new common_1.InternalServerErrorException(`Error cerrando entrega: ${error?.message}`);
        }
    }
    /**
     * Guarda la firma de recepción
     */
    async saveSignature(rutaId, base64Signature) {
        console.log("ENTRO A SAVE SIGNATURE");
        console.log("DATA:", { rutaId, base64Signature });
        if (!rutaId || !base64Signature) {
            throw new common_1.BadRequestException('rutaId y base64Signature son requeridos');
        }
        const supabase = this.supabaseConfig.getClient();
        try {
            // Remover header de data URI
            const base64Data = base64Signature.replace(/^data:image\/\w+;base64,/, '');
            // Convertir base64 a Buffer
            const buffer = Buffer.from(base64Data, 'base64');
            // Generar path único
            const filePath = `firmas/${rutaId}-${Date.now()}.png`;
            // Subir a Storage
            const { data, error: uploadError } = await supabase.storage
                .from('fotos_trazabilidad')
                .upload(filePath, buffer, {
                contentType: 'image/png',
                upsert: false,
            });
            if (uploadError) {
                throw new common_1.BadRequestException(`Error al subir firma: ${uploadError.message}`);
            }
            // Obtener URL pública
            const { data: publicUrlData } = supabase.storage
                .from('fotos_trazabilidad')
                .getPublicUrl(filePath);
            // Actualizar registro de entrega
            const { data: updatedRows, error: updateError, } = await supabase
                .from('entregas')
                .update({ firma_url: publicUrlData.publicUrl })
                .eq('ruta_id', rutaId)
                .select('id, ruta_id, firma_url');
            if (updateError) {
                console.warn(`No se pudo actualizar firma en BD: ${updateError.message}`);
                throw new common_1.BadRequestException(`Error actualizando firma en BD: ${updateError.message}`);
            }
            if (!updatedRows || updatedRows.length === 0) {
                console.warn(`⚠️ UPDATE firma_url afectó 0 filas para ruta_id=${rutaId}`);
                throw new common_1.BadRequestException(`No existe entrega para ruta_id=${rutaId}`);
            }
            console.log('Firma actualizada en BD, filas:', updatedRows);
            return {
                success: true,
                message: 'Firma guardada exitosamente',
                data: {
                    rutaId,
                    firmaUrl: publicUrlData.publicUrl,
                    entregas: updatedRows,
                },
            };
        }
        catch (error) {
            // TEMP LOG
            console.error('ERROR SAVE SIGNATURE:', error);
            throw new common_1.InternalServerErrorException(`Error guardando firma: ${error?.message}`);
        }
    }
    /**
     * Guarda la foto de la ficha de despacho
     */
    async savePhoto(rutaId, base64Photo) {
        if (!rutaId || !base64Photo) {
            throw new common_1.BadRequestException('rutaId y base64Photo son requeridos');
        }
        const supabase = this.supabaseConfig.getClient();
        try {
            // Remover header
            const base64Data = base64Photo.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            // Generar path
            const filePath = `fichas_despacho/${rutaId}-${Date.now()}.jpg`;
            // Subir archivo
            const { error: uploadError } = await supabase.storage
                .from('entregas')
                .upload(filePath, buffer, {
                contentType: 'image/jpeg',
                upsert: false,
            });
            if (uploadError) {
                throw new common_1.BadRequestException(`Error al subir foto: ${uploadError.message}`);
            }
            // Obtener URL pública
            const { data: publicUrlData } = supabase.storage
                .from('entregas')
                .getPublicUrl(filePath);
            // Actualizar ruta con URL de ficha
            const { error: updateError } = await supabase
                .from('rutas')
                .update({ ficha_despacho_url: publicUrlData.publicUrl })
                .eq('id', rutaId);
            if (updateError) {
                console.warn(`No se pudo actualizar ficha en BD: ${updateError.message}`);
            }
            return {
                success: true,
                message: 'Foto guardada exitosamente',
                data: {
                    rutaId,
                    fotoUrl: publicUrlData.publicUrl,
                },
            };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(`Error guardando foto: ${error?.message}`);
        }
    }
    /**
     * Obtiene el estado de una entrega
     */
    async getDeliveryStatus(rutaId) {
        if (!rutaId) {
            throw new common_1.BadRequestException('rutaId es requerido');
        }
        const supabase = this.supabaseConfig.getClient();
        const { data: entrega, error } = await supabase
            .from('entregas')
            .select(`
        id,
        ruta_id,
        validado,
        firma_url,
        foto_url,
        estado,
        fecha_entrega_real,
        created_at
      `)
            .eq('ruta_id', rutaId)
            .single();
        if (error) {
            throw new common_1.NotFoundException(`Entrega no encontrada: ${error.message}`);
        }
        return entrega;
    }
    // ========== HELPERS PRIVADOS ==========
    /**
     * Genera un PDF de comprobante de entrega
     */
    async generateDeliveryPDF(data) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default();
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
            doc.on('error', reject);
            // Encabezado
            doc.fontSize(20).font('Helvetica-Bold').text('COMPROBANTE DE ENTREGA', {
                align: 'center',
            });
            doc.fontSize(10).font('Helvetica');
            doc.moveDown();
            // Información de ruta
            doc.text(`Ruta ID: ${data.rutaId}`);
            doc.text(`Origen: ${data.origen}`);
            doc.text(`Destino: ${data.destino}`);
            doc.moveDown();
            // Información del cliente
            doc.text(`Cliente: ${data.cliente?.nombre || 'N/A'}`);
            doc.moveDown();
            // Información del conductor
            doc.text(`Conductor: ${data.conductor?.rut || 'N/A'}`);
            doc.moveDown();
            // Información del vehículo
            doc.text(`Vehículo: ${data.camion?.patente || 'N/A'}`);
            doc.moveDown();
            // Fechas
            doc.text(`Fecha de inicio: ${new Date(data.fechaInicio).toLocaleString('es-CL')}`);
            doc.text(`Fecha de fin: ${new Date(data.fechaFin).toLocaleString('es-CL')}`);
            doc.moveDown();
            // Firma digital del receptor
            doc.font('Helvetica-Bold').text('Firma digital del receptor');
            doc.font('Helvetica');
            doc.moveDown(0.5);
            if (data.firmaBuffer && data.firmaBuffer.length > 0) {
                try {
                    doc.image(data.firmaBuffer, {
                        fit: [200, 100],
                        align: 'center',
                    });
                    doc.moveDown();
                }
                catch (err) {
                    console.warn(`No se pudo insertar firma en PDF: ${err?.message}`);
                    doc.text('Sin firma disponible');
                    doc.moveDown();
                }
            }
            else {
                console.warn('⚠️ firmaBuffer vacío o inválido');
                doc.text('Sin firma disponible');
                doc.moveDown();
            }
            // Footer
            doc
                .fontSize(8)
                .text(`Documento generado el ${new Date().toLocaleString('es-CL')}`, {
                align: 'center',
            });
            doc.end();
        });
    }
    /**
     * Envía email de comprobante de entrega al cliente
     */
    async sendDeliveryEmail(emailCliente, nombreCliente, pdfBuffer, rutaId) {
        const resend = this.resendConfig.getClient();
        try {
            const html = `
        <html>
          <body style="font-family: Arial, sans-serif;">
            <h2>¡Entrega completada!</h2>
            <p>Estimado/a ${nombreCliente},</p>
            <p>Su entrega ha sido completada exitosamente.</p>
            <p><strong>Ruta ID:</strong> ${rutaId}</p>
            <p>Adjunto encontrará el comprobante de entrega.</p>
            <br />
            <p>Saludos,<br />Sistema LogiTrack</p>
          </body>
        </html>
      `;
            // Convertir buffer a base64
            const base64Pdf = pdfBuffer.toString('base64');
            await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || 'Sistema LogiTrack <onboarding@resend.dev>',
                to: emailCliente,
                subject: `Comprobante de Entrega - ${rutaId}`,
                html,
                attachments: [
                    {
                        filename: `comprobante-${rutaId}.pdf`,
                        content: base64Pdf,
                    },
                ],
            });
        }
        catch (error) {
            console.error(`Error enviando email: ${error?.message}`);
            // No lanzar excepción, solo registrar
        }
    }
};
exports.EntregasService = EntregasService;
exports.EntregasService = EntregasService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof supabase_config_1.SupabaseConfigService !== "undefined" && supabase_config_1.SupabaseConfigService) === "function" ? _a : Object, typeof (_b = typeof resend_config_1.ResendConfigService !== "undefined" && resend_config_1.ResendConfigService) === "function" ? _b : Object])
], EntregasService);


/***/ }),

/***/ "./src/modules/incidencias/incidencias.controller.ts":
/*!***********************************************************!*\
  !*** ./src/modules/incidencias/incidencias.controller.ts ***!
  \***********************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.IncidenciasController = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const incidencias_service_1 = __webpack_require__(/*! ./incidencias.service */ "./src/modules/incidencias/incidencias.service.ts");
const jwt_guard_1 = __webpack_require__(/*! ../../common/guards/jwt.guard */ "./src/common/guards/jwt.guard.ts");
let IncidenciasController = class IncidenciasController {
    constructor(incidenciasService) {
        this.incidenciasService = incidenciasService;
    }
    async listIncidencias() {
        return await this.incidenciasService.listIncidencias();
    }
    async acknowledgeIncidencia(incidenciaId, body) {
        return await this.incidenciasService.acknowledgeIncidencia(incidenciaId, body.operatorId);
    }
    async resolveIncidencia(incidenciaId) {
        return await this.incidenciasService.resolveIncidencia(incidenciaId);
    }
};
exports.IncidenciasController = IncidenciasController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], IncidenciasController.prototype, "listIncidencias", null);
__decorate([
    (0, common_1.Patch)(':id/acknowledge'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], IncidenciasController.prototype, "acknowledgeIncidencia", null);
__decorate([
    (0, common_1.Patch)(':id/resolve'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IncidenciasController.prototype, "resolveIncidencia", null);
exports.IncidenciasController = IncidenciasController = __decorate([
    (0, common_1.Controller)('api/incidencias'),
    __metadata("design:paramtypes", [typeof (_a = typeof incidencias_service_1.IncidenciasService !== "undefined" && incidencias_service_1.IncidenciasService) === "function" ? _a : Object])
], IncidenciasController);


/***/ }),

/***/ "./src/modules/incidencias/incidencias.module.ts":
/*!*******************************************************!*\
  !*** ./src/modules/incidencias/incidencias.module.ts ***!
  \*******************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.IncidenciasModule = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const incidencias_controller_1 = __webpack_require__(/*! ./incidencias.controller */ "./src/modules/incidencias/incidencias.controller.ts");
const incidencias_service_1 = __webpack_require__(/*! ./incidencias.service */ "./src/modules/incidencias/incidencias.service.ts");
const supabase_config_1 = __webpack_require__(/*! ../../config/supabase.config */ "./src/config/supabase.config.ts");
let IncidenciasModule = class IncidenciasModule {
};
exports.IncidenciasModule = IncidenciasModule;
exports.IncidenciasModule = IncidenciasModule = __decorate([
    (0, common_1.Module)({
        providers: [incidencias_service_1.IncidenciasService, supabase_config_1.SupabaseConfigService],
        controllers: [incidencias_controller_1.IncidenciasController],
        exports: [incidencias_service_1.IncidenciasService],
    })
], IncidenciasModule);


/***/ }),

/***/ "./src/modules/incidencias/incidencias.service.ts":
/*!********************************************************!*\
  !*** ./src/modules/incidencias/incidencias.service.ts ***!
  \********************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.IncidenciasService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const supabase_config_1 = __webpack_require__(/*! ../../config/supabase.config */ "./src/config/supabase.config.ts");
let IncidenciasService = class IncidenciasService {
    constructor(supabaseConfig) {
        this.supabaseConfig = supabaseConfig;
    }
    async listIncidencias() {
        const supabase = this.supabaseConfig.getClient();
        const { data, error } = await supabase
            .from('incidencias')
            .select(`
        *,
        conductores (
          id,
          usuarios ( nombre )
        ),
        rutas (
          id,
          camiones ( id, patente )
        )
      `)
            .order('created_at', { ascending: false });
        if (error) {
            throw new common_1.InternalServerErrorException(`Error al listar incidencias: ${error.message}`);
        }
        return { success: true, data };
    }
    async acknowledgeIncidencia(incidenciaId, operatorId) {
        if (!incidenciaId) {
            throw new common_1.BadRequestException('incidenciaId es requerido');
        }
        if (!operatorId) {
            throw new common_1.BadRequestException('operatorId es requerido');
        }
        const supabase = this.supabaseConfig.getClient();
        const { data, error } = await supabase
            .from('incidencias')
            .update({
            estado: 'EN_GESTION',
            atendido_por: operatorId,
            fecha_atencion: new Date().toISOString(),
        })
            .eq('id', incidenciaId)
            .single();
        if (error) {
            throw new common_1.InternalServerErrorException(`Error al actualizar incidencia: ${error.message}`);
        }
        if (!data) {
            throw new common_1.NotFoundException('Incidencia no encontrada');
        }
        return { success: true, data };
    }
    async resolveIncidencia(incidenciaId) {
        if (!incidenciaId) {
            throw new common_1.BadRequestException('incidenciaId es requerido');
        }
        const supabase = this.supabaseConfig.getClient();
        const { data, error } = await supabase
            .from('incidencias')
            .update({
            estado: 'RESUELTO',
            fecha_resolucion: new Date().toISOString(),
        })
            .eq('id', incidenciaId)
            .single();
        if (error) {
            throw new common_1.InternalServerErrorException(`Error al resolver incidencia: ${error.message}`);
        }
        if (!data) {
            throw new common_1.NotFoundException('Incidencia no encontrada');
        }
        return { success: true, data };
    }
};
exports.IncidenciasService = IncidenciasService;
exports.IncidenciasService = IncidenciasService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof supabase_config_1.SupabaseConfigService !== "undefined" && supabase_config_1.SupabaseConfigService) === "function" ? _a : Object])
], IncidenciasService);


/***/ }),

/***/ "./src/modules/rutas/rutas.controller.ts":
/*!***********************************************!*\
  !*** ./src/modules/rutas/rutas.controller.ts ***!
  \***********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RutasController = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const rutas_service_1 = __webpack_require__(/*! ./rutas.service */ "./src/modules/rutas/rutas.service.ts");
const jwt_guard_1 = __webpack_require__(/*! ../../common/guards/jwt.guard */ "./src/common/guards/jwt.guard.ts");
const user_decorator_1 = __webpack_require__(/*! ../../common/decorators/user.decorator */ "./src/common/decorators/user.decorator.ts");
let RutasController = class RutasController {
    constructor(rutasService) {
        this.rutasService = rutasService;
    }
    /**
     * POST /api/rutas/assign
     * Asigna un conductor a una ruta
     */
    async assignDriver(userId, body) {
        return await this.rutasService.assignDriverToRoute(body.rutaId, body.conductorId, body.camionId, userId, body.cargaRequeridaKg);
    }
    /**
     * GET /api/rutas/unassigned
     * Obtiene rutas sin asignar
     */
    async getUnassignedRoutes() {
        return await this.rutasService.getUnassignedRoutes();
    }
    /**
     * GET /api/rutas/:id
     * Obtiene información detallada de una ruta
     */
    async getRouteInfo(rutaId) {
        return await this.rutasService.getRouteInfo(rutaId);
    }
    /**
     * PATCH /api/rutas/:id/status
     * Actualiza el estado de una ruta
     */
    async updateStatus(rutaId, body) {
        return await this.rutasService.updateRouteStatus(rutaId, body.estado);
    }
    /**
     * GET /api/rutas
     * Lista rutas con filtros opcionales
     */
    async listRoutes(estado, conductorId, clienteId) {
        return await this.rutasService.listRoutes({
            estado,
            conductorId,
            clienteId,
        });
    }
};
exports.RutasController = RutasController;
__decorate([
    (0, common_1.Post)('assign'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RutasController.prototype, "assignDriver", null);
__decorate([
    (0, common_1.Get)('unassigned'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RutasController.prototype, "getUnassignedRoutes", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RutasController.prototype, "getRouteInfo", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RutasController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Query)('estado')),
    __param(1, (0, common_1.Query)('conductorId')),
    __param(2, (0, common_1.Query)('clienteId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], RutasController.prototype, "listRoutes", null);
exports.RutasController = RutasController = __decorate([
    (0, common_1.Controller)('api/rutas'),
    __metadata("design:paramtypes", [typeof (_a = typeof rutas_service_1.RutasService !== "undefined" && rutas_service_1.RutasService) === "function" ? _a : Object])
], RutasController);


/***/ }),

/***/ "./src/modules/rutas/rutas.module.ts":
/*!*******************************************!*\
  !*** ./src/modules/rutas/rutas.module.ts ***!
  \*******************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RutasModule = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const rutas_service_1 = __webpack_require__(/*! ./rutas.service */ "./src/modules/rutas/rutas.service.ts");
const rutas_controller_1 = __webpack_require__(/*! ./rutas.controller */ "./src/modules/rutas/rutas.controller.ts");
const supabase_config_1 = __webpack_require__(/*! ../../config/supabase.config */ "./src/config/supabase.config.ts");
const conductores_module_1 = __webpack_require__(/*! ../conductores/conductores.module */ "./src/modules/conductores/conductores.module.ts");
let RutasModule = class RutasModule {
};
exports.RutasModule = RutasModule;
exports.RutasModule = RutasModule = __decorate([
    (0, common_1.Module)({
        imports: [conductores_module_1.ConductoresModule],
        providers: [rutas_service_1.RutasService, supabase_config_1.SupabaseConfigService],
        controllers: [rutas_controller_1.RutasController],
        exports: [rutas_service_1.RutasService],
    })
], RutasModule);


/***/ }),

/***/ "./src/modules/rutas/rutas.service.ts":
/*!********************************************!*\
  !*** ./src/modules/rutas/rutas.service.ts ***!
  \********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RutasService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const supabase_config_1 = __webpack_require__(/*! ../../config/supabase.config */ "./src/config/supabase.config.ts");
const conductores_service_1 = __webpack_require__(/*! ../conductores/conductores.service */ "./src/modules/conductores/conductores.service.ts");
let RutasService = class RutasService {
    constructor(supabaseConfig, conductoresService) {
        this.supabaseConfig = supabaseConfig;
        this.conductoresService = conductoresService;
    }
    /**
     * Asigna un conductor a una ruta después de validar su licencia
     */
    async assignDriverToRoute(rutaId, conductorId, camionId, userId, // Usuario que hace la asignación (debe ser admin/dispatcher)
    cargaRequeridaKg) {
        if (!rutaId || !conductorId || !camionId) {
            throw new common_1.BadRequestException('rutaId, conductorId y camionId son requeridos');
        }
        const supabase = this.supabaseConfig.getClient();
        // PASO 1: Validar licencia del conductor
        const licenseValidation = await this.conductoresService.validateDriverLicense(conductorId);
        if (!licenseValidation.isValid) {
            throw new common_1.ForbiddenException(`No se puede asignar ruta: ${licenseValidation.message}`);
        }
        // PASO 2: Validar capacidad del camión
        const { data: camion, error: camionError } = await supabase
            .from('camiones')
            .select('id, patente, capacidad_kg, estado')
            .eq('id', camionId)
            .single();
        if (camionError || !camion) {
            throw new common_1.NotFoundException('Camión no encontrado');
        }
        if (camion.estado !== 'DISPONIBLE') {
            throw new common_1.ForbiddenException(`El camión no está disponible (estado: ${camion.estado})`);
        }
        if (cargaRequeridaKg && camion.capacidad_kg && camion.capacidad_kg < cargaRequeridaKg) {
            throw new common_1.ForbiddenException(`Capacidad insuficiente: requerida ${cargaRequeridaKg}kg, disponible ${camion.capacidad_kg}kg`);
        }
        // PASO 3: Verificar que la ruta existe y no está asignada
        const { data: ruta, error: rutaError } = await supabase
            .from('rutas')
            .select('id, estado, conductor_id')
            .eq('id', rutaId)
            .single();
        if (rutaError || !ruta) {
            throw new common_1.NotFoundException('Ruta no encontrada');
        }
        if (ruta.conductor_id) {
            throw new common_1.ForbiddenException('La ruta ya tiene un conductor asignado');
        }
        // PASO 4: Actualizar ruta con conductor y camión
        const { data: rutaActualizada, error: updateError } = await supabase
            .from('rutas')
            .update({
            conductor_id: conductorId,
            camion_id: camionId,
            fecha_inicio: new Date().toISOString(),
            estado: 'ASIGNADA',
        })
            .eq('id', rutaId)
            .select();
        if (updateError) {
            throw new common_1.BadRequestException(`Error al actualizar ruta: ${updateError.message}`);
        }
        // PASO 5: Registrar en historial
        await supabase.from('historial_estados').insert([
            {
                ruta_id: rutaId,
                estado: 'ASIGNADA',
                created_at: new Date().toISOString(),
            },
        ]);
        return {
            success: true,
            message: 'Conductor asignado a la ruta exitosamente',
            data: {
                rutaId,
                conductorId,
                camionId,
                estado: 'ASIGNADA',
            },
        };
    }
    /**
     * Obtiene rutas sin asignar
     */
    async getUnassignedRoutes() {
        const supabase = this.supabaseConfig.getClient();
        const { data: rutas, error } = await supabase
            .from('rutas')
            .select(`
        id,
        origen,
        destino,
        estado,
        created_at,
        cliente_id,
        clientes(nombre)
      `)
            .is('conductor_id', null)
            .eq('estado', 'PENDIENTE')
            .order('created_at', { ascending: true });
        if (error) {
            throw new common_1.BadRequestException(`Error al obtener rutas: ${error.message}`);
        }
        return rutas || [];
    }
    /**
     * Obtiene información detallada de una ruta
     */
    async getRouteInfo(rutaId) {
        if (!rutaId) {
            throw new common_1.BadRequestException('rutaId es requerido');
        }
        const supabase = this.supabaseConfig.getClient();
        const { data: ruta, error } = await supabase
            .from('rutas')
            .select(`
        id,
        origen,
        destino,
        estado,
        fecha_inicio,
        fecha_fin,
        eta,
        created_at,
        cliente_id,
        conductor_id,
        camion_id,
        clientes(id, nombre),
        conductores(id, rut, licencia_vencimiento),
        camiones(id, patente, capacidad_kg)
      `)
            .eq('id', rutaId)
            .single();
        if (error) {
            throw new common_1.NotFoundException(`Ruta no encontrada: ${error.message}`);
        }
        return {
            ...ruta,
            licenseStatus: ruta.conductor_id
                ? await this.conductoresService.validateDriverLicense(ruta.conductor_id)
                : null,
        };
    }
    /**
     * Cambia el estado de una ruta
     */
    async updateRouteStatus(rutaId, nuevoEstado) {
        if (!rutaId || !nuevoEstado) {
            throw new common_1.BadRequestException('rutaId y nuevoEstado son requeridos');
        }
        const supabase = this.supabaseConfig.getClient();
        // Estados válidos
        const estadosValidos = ['PENDIENTE', 'ASIGNADA', 'EN_PROCESO', 'ENTREGADA', 'CANCELADA'];
        if (!estadosValidos.includes(nuevoEstado)) {
            throw new common_1.BadRequestException(`Estado inválido. Acepta: ${estadosValidos.join(', ')}`);
        }
        const { data: rutaActualizada, error } = await supabase
            .from('rutas')
            .update({
            estado: nuevoEstado,
            fecha_fin: nuevoEstado === 'ENTREGADA' ? new Date().toISOString() : null,
        })
            .eq('id', rutaId)
            .select();
        if (error) {
            throw new common_1.BadRequestException(`Error al actualizar ruta: ${error.message}`);
        }
        // Registrar en historial
        await supabase.from('historial_estados').insert([
            {
                ruta_id: rutaId,
                estado: nuevoEstado,
                created_at: new Date().toISOString(),
            },
        ]);
        return {
            success: true,
            message: `Ruta actualizada a estado: ${nuevoEstado}`,
            data: rutaActualizada[0],
        };
    }
    /**
     * Lista todas las rutas con filtros opcionales
     */
    async listRoutes(filters) {
        const supabase = this.supabaseConfig.getClient();
        let query = supabase.from('rutas').select(`
      id,
      origen,
      destino,
      estado,
      fecha_inicio,
      fecha_fin,
      clientes(nombre),
      conductores(rut),
      camiones(patente)
    `);
        if (filters?.estado) {
            query = query.eq('estado', filters.estado);
        }
        if (filters?.conductorId) {
            query = query.eq('conductor_id', filters.conductorId);
        }
        if (filters?.clienteId) {
            query = query.eq('cliente_id', filters.clienteId);
        }
        const { data: rutas, error } = await query.order('created_at', { ascending: false });
        if (error) {
            throw new common_1.BadRequestException(`Error al obtener rutas: ${error.message}`);
        }
        return rutas || [];
    }
};
exports.RutasService = RutasService;
exports.RutasService = RutasService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof supabase_config_1.SupabaseConfigService !== "undefined" && supabase_config_1.SupabaseConfigService) === "function" ? _a : Object, typeof (_b = typeof conductores_service_1.ConductoresService !== "undefined" && conductores_service_1.ConductoresService) === "function" ? _b : Object])
], RutasService);


/***/ }),

/***/ "./src/modules/storage/storage.controller.ts":
/*!***************************************************!*\
  !*** ./src/modules/storage/storage.controller.ts ***!
  \***************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StorageController = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const platform_express_1 = __webpack_require__(/*! @nestjs/platform-express */ "@nestjs/platform-express");
const multer_1 = __webpack_require__(/*! multer */ "multer");
const storage_service_1 = __webpack_require__(/*! ./storage.service */ "./src/modules/storage/storage.service.ts");
let StorageController = class StorageController {
    constructor(storageService) {
        this.storageService = storageService;
    }
    async uploadFile(file, bucket, folder) {
        if (!file) {
            throw new common_1.BadRequestException('El archivo es requerido');
        }
        if (!file.mimetype?.startsWith('image/')) {
            throw new common_1.BadRequestException('Solo se permiten archivos de imagen');
        }
        return this.storageService.uploadFile(file, bucket, folder);
    }
};
exports.StorageController = StorageController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('bucket')),
    __param(2, (0, common_1.Body)('folder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_c = typeof Express !== "undefined" && (_b = Express.Multer) !== void 0 && _b.File) === "function" ? _c : Object, String, String]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "uploadFile", null);
exports.StorageController = StorageController = __decorate([
    (0, common_1.Controller)('api/storage'),
    __metadata("design:paramtypes", [typeof (_a = typeof storage_service_1.StorageService !== "undefined" && storage_service_1.StorageService) === "function" ? _a : Object])
], StorageController);


/***/ }),

/***/ "./src/modules/storage/storage.module.ts":
/*!***********************************************!*\
  !*** ./src/modules/storage/storage.module.ts ***!
  \***********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StorageModule = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const supabase_config_1 = __webpack_require__(/*! ../../config/supabase.config */ "./src/config/supabase.config.ts");
const storage_controller_1 = __webpack_require__(/*! ./storage.controller */ "./src/modules/storage/storage.controller.ts");
const storage_service_1 = __webpack_require__(/*! ./storage.service */ "./src/modules/storage/storage.service.ts");
let StorageModule = class StorageModule {
};
exports.StorageModule = StorageModule;
exports.StorageModule = StorageModule = __decorate([
    (0, common_1.Module)({
        controllers: [storage_controller_1.StorageController],
        providers: [storage_service_1.StorageService, supabase_config_1.SupabaseConfigService],
    })
], StorageModule);


/***/ }),

/***/ "./src/modules/storage/storage.service.ts":
/*!************************************************!*\
  !*** ./src/modules/storage/storage.service.ts ***!
  \************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StorageService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const supabase_config_1 = __webpack_require__(/*! ../../config/supabase.config */ "./src/config/supabase.config.ts");
let StorageService = class StorageService {
    constructor(supabaseConfig) {
        this.supabaseConfig = supabaseConfig;
    }
    async uploadFile(file, bucket, folder) {
        if (!file?.buffer) {
            throw new common_1.BadRequestException('El archivo no contiene datos para subir');
        }
        if (!bucket) {
            throw new common_1.BadRequestException('El bucket es requerido');
        }
        if (!folder) {
            throw new common_1.BadRequestException('La carpeta es requerida');
        }
        const normalizedFolder = folder.replace(/^\/+|\/+$/g, '');
        const timestamp = Date.now();
        const originalName = file.originalname?.replace(/\s+/g, '_') || 'file';
        const filePath = `${normalizedFolder}/${timestamp}_${originalName}`;
        await this.supabaseConfig.uploadFile(bucket, filePath, file.buffer, file.mimetype);
        const publicUrl = this.supabaseConfig.getPublicUrl(bucket, filePath);
        return {
            filePath,
            publicUrl,
            bucket,
        };
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof supabase_config_1.SupabaseConfigService !== "undefined" && supabase_config_1.SupabaseConfigService) === "function" ? _a : Object])
], StorageService);


/***/ }),

/***/ "./src/modules/trazabilidad/trazabilidad.controller.ts":
/*!*************************************************************!*\
  !*** ./src/modules/trazabilidad/trazabilidad.controller.ts ***!
  \*************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TrazabilidadController = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const trazabilidad_service_1 = __webpack_require__(/*! ./trazabilidad.service */ "./src/modules/trazabilidad/trazabilidad.service.ts");
let TrazabilidadController = class TrazabilidadController {
    constructor(trazabilidadService) {
        this.trazabilidadService = trazabilidadService;
    }
    async createEvent(body) {
        console.log('BODY TRAZABILIDAD:', body);
        const { id, etapa, foto_uri, latitud, longitud, timestamp_evento } = body;
        if (typeof id !== 'string' || !id.trim()) {
            throw new common_1.BadRequestException('id es requerido');
        }
        if (typeof etapa !== 'string' || !etapa.trim()) {
            throw new common_1.BadRequestException('etapa es requerida');
        }
        if (typeof timestamp_evento !== 'string' || !timestamp_evento.trim()) {
            throw new common_1.BadRequestException('timestamp_evento es requerido');
        }
        if (typeof latitud !== 'number' || typeof longitud !== 'number') {
            throw new common_1.BadRequestException('latitud y longitud deben ser números');
        }
        if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
            throw new common_1.BadRequestException('latitud y longitud deben ser números válidos');
        }
        return this.trazabilidadService.createEvent({
            id,
            etapa,
            foto_uri: foto_uri ?? null,
            latitud,
            longitud,
            timestamp_evento,
        });
    }
};
exports.TrazabilidadController = TrazabilidadController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TrazabilidadController.prototype, "createEvent", null);
exports.TrazabilidadController = TrazabilidadController = __decorate([
    (0, common_1.Controller)('api/trazabilidad'),
    __metadata("design:paramtypes", [typeof (_a = typeof trazabilidad_service_1.TrazabilidadService !== "undefined" && trazabilidad_service_1.TrazabilidadService) === "function" ? _a : Object])
], TrazabilidadController);


/***/ }),

/***/ "./src/modules/trazabilidad/trazabilidad.module.ts":
/*!*********************************************************!*\
  !*** ./src/modules/trazabilidad/trazabilidad.module.ts ***!
  \*********************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TrazabilidadModule = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const supabase_config_1 = __webpack_require__(/*! ../../config/supabase.config */ "./src/config/supabase.config.ts");
const trazabilidad_controller_1 = __webpack_require__(/*! ./trazabilidad.controller */ "./src/modules/trazabilidad/trazabilidad.controller.ts");
const trazabilidad_service_1 = __webpack_require__(/*! ./trazabilidad.service */ "./src/modules/trazabilidad/trazabilidad.service.ts");
let TrazabilidadModule = class TrazabilidadModule {
};
exports.TrazabilidadModule = TrazabilidadModule;
exports.TrazabilidadModule = TrazabilidadModule = __decorate([
    (0, common_1.Module)({
        controllers: [trazabilidad_controller_1.TrazabilidadController],
        providers: [trazabilidad_service_1.TrazabilidadService, supabase_config_1.SupabaseConfigService],
    })
], TrazabilidadModule);


/***/ }),

/***/ "./src/modules/trazabilidad/trazabilidad.service.ts":
/*!**********************************************************!*\
  !*** ./src/modules/trazabilidad/trazabilidad.service.ts ***!
  \**********************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TrazabilidadService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const supabase_config_1 = __webpack_require__(/*! ../../config/supabase.config */ "./src/config/supabase.config.ts");
let TrazabilidadService = class TrazabilidadService {
    constructor(supabaseConfig) {
        this.supabaseConfig = supabaseConfig;
    }
    async createEvent(data) {
        const supabase = this.supabaseConfig.getClient();
        const { data: row, error } = await supabase
            .from('traceability_events')
            .upsert({
            id: data.id,
            etapa: data.etapa,
            foto_uri: data.foto_uri,
            latitud: data.latitud,
            longitud: data.longitud,
            timestamp_evento: data.timestamp_evento,
        }, { onConflict: 'id' })
            .select()
            .single();
        if (error) {
            console.error('ERROR SUPABASE TRAZABILIDAD:', error);
            throw new common_1.BadRequestException(`Error al registrar evento: ${error.message}`);
        }
        return row;
    }
};
exports.TrazabilidadService = TrazabilidadService;
exports.TrazabilidadService = TrazabilidadService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof supabase_config_1.SupabaseConfigService !== "undefined" && supabase_config_1.SupabaseConfigService) === "function" ? _a : Object])
], TrazabilidadService);


/***/ }),

/***/ "@nestjs/common":
/*!*********************************!*\
  !*** external "@nestjs/common" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("@nestjs/common");

/***/ }),

/***/ "@nestjs/config":
/*!*********************************!*\
  !*** external "@nestjs/config" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("@nestjs/config");

/***/ }),

/***/ "@nestjs/core":
/*!*******************************!*\
  !*** external "@nestjs/core" ***!
  \*******************************/
/***/ ((module) => {

module.exports = require("@nestjs/core");

/***/ }),

/***/ "@nestjs/jwt":
/*!******************************!*\
  !*** external "@nestjs/jwt" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("@nestjs/jwt");

/***/ }),

/***/ "@nestjs/passport":
/*!***********************************!*\
  !*** external "@nestjs/passport" ***!
  \***********************************/
/***/ ((module) => {

module.exports = require("@nestjs/passport");

/***/ }),

/***/ "@nestjs/platform-express":
/*!*******************************************!*\
  !*** external "@nestjs/platform-express" ***!
  \*******************************************/
/***/ ((module) => {

module.exports = require("@nestjs/platform-express");

/***/ }),

/***/ "@supabase/supabase-js":
/*!****************************************!*\
  !*** external "@supabase/supabase-js" ***!
  \****************************************/
/***/ ((module) => {

module.exports = require("@supabase/supabase-js");

/***/ }),

/***/ "compression":
/*!******************************!*\
  !*** external "compression" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("compression");

/***/ }),

/***/ "helmet":
/*!*************************!*\
  !*** external "helmet" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("helmet");

/***/ }),

/***/ "multer":
/*!*************************!*\
  !*** external "multer" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("multer");

/***/ }),

/***/ "passport-jwt":
/*!*******************************!*\
  !*** external "passport-jwt" ***!
  \*******************************/
/***/ ((module) => {

module.exports = require("passport-jwt");

/***/ }),

/***/ "pdfkit":
/*!*************************!*\
  !*** external "pdfkit" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("pdfkit");

/***/ }),

/***/ "resend":
/*!*************************!*\
  !*** external "resend" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("resend");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/main.ts");
/******/ 	
/******/ })()
;