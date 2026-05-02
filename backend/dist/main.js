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
const clientes_module_1 = __webpack_require__(/*! ./modules/clientes/clientes.module */ "./src/modules/clientes/clientes.module.ts");
const camiones_module_1 = __webpack_require__(/*! ./modules/camiones/camiones.module */ "./src/modules/camiones/camiones.module.ts");
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
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    secret: config.get('JWT_SECRET'),
                    signOptions: { expiresIn: '24h' },
                }),
            }),
            auth_module_1.AuthModule,
            conductores_module_1.ConductoresModule,
            rutas_module_1.RutasModule,
            entregas_module_1.EntregasModule,
            incidencias_module_1.IncidenciasModule,
            email_module_1.EmailModule,
            storage_module_1.StorageModule,
            trazabilidad_module_1.TrazabilidadModule,
            clientes_module_1.ClientesModule,
            camiones_module_1.CamionesModule,
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
        console.log('JWT VALIDATE', {
            email: payload?.email,
            sub: payload?.sub,
            role: payload?.role ?? payload?.user_role,
        });
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
    /**
     * Lista archivos dentro de una carpeta de un bucket.
     * Devuelve un arreglo vacío si la carpeta no existe o está vacía.
     * `prefix` debe ser la ruta SIN slash final (ej: `comprobantes/${rutaId}`).
     */
    async listFiles(bucket, prefix, limit = 100) {
        const { data, error } = await this.supabaseClient.storage
            .from(bucket)
            .list(prefix, {
            limit,
            sortBy: { column: 'created_at', order: 'desc' },
        });
        if (error) {
            // No tirar error: tratamos "carpeta inexistente" como lista vacía.
            return [];
        }
        return (data || [])
            .filter((entry) => entry?.name && entry.name !== '.emptyFolderPlaceholder')
            .map((entry) => ({
            name: entry.name,
            created_at: entry.created_at,
        }));
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
const express_1 = __webpack_require__(/*! express */ "express");
async function bootstrap() {
    console.log('BACKEND ENV CHECK:', {
        DEBUG_EMAIL_defined: !!process.env.DEBUG_EMAIL,
        DEBUG_PASSWORD_defined: !!process.env.DEBUG_PASSWORD,
        JWT_SECRET_defined: !!process.env.JWT_SECRET,
    });
    // Desactivamos el bodyParser default de Nest para poder definir nuestros
    // propios límites (las fichas de despacho llegan como base64 ~5–15 MB).
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['log', 'error', 'warn', 'debug'],
        bodyParser: false,
    });
    app.use((0, express_1.json)({ limit: '20mb' }));
    app.use((0, express_1.urlencoded)({ limit: '20mb', extended: true }));
    app.enableCors({
        origin: [
            'http://localhost:3001',
            'http://localhost:3000',
            'http://192.168.0.3:3000',
            'http://192.168.0.4:3000',
            /https:\/\/.*\.trycloudflare\.com$/,
        ],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    app.use((req, _res, next) => {
        console.log(`[REQ] ${req.method} ${req.url}`);
        next();
    });
    // Security
    app.use((0, helmet_1.default)());
    app.use((0, compression_1.default)());
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

/***/ "./src/modules/camiones/camiones.controller.ts":
/*!*****************************************************!*\
  !*** ./src/modules/camiones/camiones.controller.ts ***!
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
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CamionesController = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const camiones_service_1 = __webpack_require__(/*! ./camiones.service */ "./src/modules/camiones/camiones.service.ts");
const jwt_guard_1 = __webpack_require__(/*! ../../common/guards/jwt.guard */ "./src/common/guards/jwt.guard.ts");
let CamionesController = class CamionesController {
    constructor(camionesService) {
        this.camionesService = camionesService;
    }
    /**
     * GET /api/camiones
     * Lista todos los camiones activos (con su estado real).
     */
    async list() {
        return await this.camionesService.listCamiones();
    }
    /**
     * GET /api/camiones/disponibles
     * Lista solo camiones DISPONIBLES (útil para asignación de rutas).
     */
    async listDisponibles() {
        return await this.camionesService.listCamionesDisponibles();
    }
};
exports.CamionesController = CamionesController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CamionesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('disponibles'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CamionesController.prototype, "listDisponibles", null);
exports.CamionesController = CamionesController = __decorate([
    (0, common_1.Controller)('api/camiones'),
    __metadata("design:paramtypes", [typeof (_a = typeof camiones_service_1.CamionesService !== "undefined" && camiones_service_1.CamionesService) === "function" ? _a : Object])
], CamionesController);


/***/ }),

/***/ "./src/modules/camiones/camiones.module.ts":
/*!*************************************************!*\
  !*** ./src/modules/camiones/camiones.module.ts ***!
  \*************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CamionesModule = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const camiones_service_1 = __webpack_require__(/*! ./camiones.service */ "./src/modules/camiones/camiones.service.ts");
const camiones_controller_1 = __webpack_require__(/*! ./camiones.controller */ "./src/modules/camiones/camiones.controller.ts");
const supabase_config_1 = __webpack_require__(/*! ../../config/supabase.config */ "./src/config/supabase.config.ts");
let CamionesModule = class CamionesModule {
};
exports.CamionesModule = CamionesModule;
exports.CamionesModule = CamionesModule = __decorate([
    (0, common_1.Module)({
        providers: [camiones_service_1.CamionesService, supabase_config_1.SupabaseConfigService],
        controllers: [camiones_controller_1.CamionesController],
        exports: [camiones_service_1.CamionesService],
    })
], CamionesModule);


/***/ }),

/***/ "./src/modules/camiones/camiones.service.ts":
/*!**************************************************!*\
  !*** ./src/modules/camiones/camiones.service.ts ***!
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
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CamionesService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const supabase_config_1 = __webpack_require__(/*! ../../config/supabase.config */ "./src/config/supabase.config.ts");
// Schema real de `public.camiones`:
//   id, patente*, capacidad_kg, estado (enum estado_camion:
//   DISPONIBLE | EN_RUTA | MANTENCION), activo, ultima_mantencion,
//   proxima_mantencion, created_at.
let CamionesService = class CamionesService {
    constructor(supabaseConfig) {
        this.supabaseConfig = supabaseConfig;
    }
    async listCamiones() {
        const supabase = this.supabaseConfig.getClient();
        const { data, error } = await supabase
            .from('camiones')
            .select('id, patente, capacidad_kg, estado, activo')
            .eq('activo', true)
            .order('patente', { ascending: true });
        if (error) {
            throw new common_1.BadRequestException(`Error al obtener camiones: ${error.message}`);
        }
        // Garantiza el contrato mínimo solicitado por la UI:
        // [{ id, patente, estado }]. Si la BD trae estado null, fallback DISPONIBLE.
        return (data || []).map((c) => ({
            id: c.id,
            patente: c.patente,
            capacidad_kg: c.capacidad_kg ?? null,
            estado: c.estado ?? 'DISPONIBLE',
        }));
    }
    async listCamionesDisponibles() {
        const supabase = this.supabaseConfig.getClient();
        const { data, error } = await supabase
            .from('camiones')
            .select('id, patente, capacidad_kg, estado')
            .eq('activo', true)
            .eq('estado', 'DISPONIBLE')
            .order('patente', { ascending: true });
        if (error) {
            throw new common_1.BadRequestException(`Error al obtener camiones disponibles: ${error.message}`);
        }
        return data || [];
    }
};
exports.CamionesService = CamionesService;
exports.CamionesService = CamionesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof supabase_config_1.SupabaseConfigService !== "undefined" && supabase_config_1.SupabaseConfigService) === "function" ? _a : Object])
], CamionesService);


/***/ }),

/***/ "./src/modules/clientes/clientes.controller.ts":
/*!*****************************************************!*\
  !*** ./src/modules/clientes/clientes.controller.ts ***!
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
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ClientesController = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const clientes_service_1 = __webpack_require__(/*! ./clientes.service */ "./src/modules/clientes/clientes.service.ts");
const jwt_guard_1 = __webpack_require__(/*! ../../common/guards/jwt.guard */ "./src/common/guards/jwt.guard.ts");
let ClientesController = class ClientesController {
    constructor(clientesService) {
        this.clientesService = clientesService;
    }
    /**
     * POST /api/clientes
     * Crea un nuevo cliente.
     */
    async createCliente(body) {
        return await this.clientesService.createCliente(body);
    }
    /**
     * GET /api/clientes
     * Lista todos los clientes.
     */
    async listClientes() {
        return await this.clientesService.listClientes();
    }
    /**
     * GET /api/clientes/:id
     * Obtiene el detalle de un cliente.
     */
    async getCliente(id) {
        return await this.clientesService.getCliente(id);
    }
};
exports.ClientesController = ClientesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof clientes_service_1.CreateClienteDto !== "undefined" && clientes_service_1.CreateClienteDto) === "function" ? _b : Object]),
    __metadata("design:returntype", Promise)
], ClientesController.prototype, "createCliente", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ClientesController.prototype, "listClientes", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ClientesController.prototype, "getCliente", null);
exports.ClientesController = ClientesController = __decorate([
    (0, common_1.Controller)('api/clientes'),
    __metadata("design:paramtypes", [typeof (_a = typeof clientes_service_1.ClientesService !== "undefined" && clientes_service_1.ClientesService) === "function" ? _a : Object])
], ClientesController);


/***/ }),

/***/ "./src/modules/clientes/clientes.module.ts":
/*!*************************************************!*\
  !*** ./src/modules/clientes/clientes.module.ts ***!
  \*************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ClientesModule = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const clientes_service_1 = __webpack_require__(/*! ./clientes.service */ "./src/modules/clientes/clientes.service.ts");
const clientes_controller_1 = __webpack_require__(/*! ./clientes.controller */ "./src/modules/clientes/clientes.controller.ts");
const supabase_config_1 = __webpack_require__(/*! ../../config/supabase.config */ "./src/config/supabase.config.ts");
let ClientesModule = class ClientesModule {
};
exports.ClientesModule = ClientesModule;
exports.ClientesModule = ClientesModule = __decorate([
    (0, common_1.Module)({
        providers: [clientes_service_1.ClientesService, supabase_config_1.SupabaseConfigService],
        controllers: [clientes_controller_1.ClientesController],
        exports: [clientes_service_1.ClientesService],
    })
], ClientesModule);


/***/ }),

/***/ "./src/modules/clientes/clientes.service.ts":
/*!**************************************************!*\
  !*** ./src/modules/clientes/clientes.service.ts ***!
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
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ClientesService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const supabase_config_1 = __webpack_require__(/*! ../../config/supabase.config */ "./src/config/supabase.config.ts");
let ClientesService = class ClientesService {
    constructor(supabaseConfig) {
        this.supabaseConfig = supabaseConfig;
    }
    async createCliente(payload) {
        if (!payload?.nombre?.trim()) {
            throw new common_1.BadRequestException('El nombre es requerido');
        }
        const supabase = this.supabaseConfig.getClient();
        const insertRow = {
            nombre: payload.nombre.trim(),
            rut: payload.rut?.trim() || null,
            direccion: payload.direccion?.trim() || null,
            contacto_nombre: payload.contacto_nombre?.trim() || null,
            contacto_telefono: payload.contacto_telefono?.trim() || null,
            contacto_email: payload.contacto_email?.trim() || null,
        };
        const { data, error } = await supabase
            .from('clientes')
            .insert([insertRow])
            .select()
            .single();
        if (error) {
            throw new common_1.BadRequestException(`Error al crear cliente: ${error.message}`);
        }
        return {
            success: true,
            message: 'Cliente creado exitosamente',
            data,
        };
    }
    async listClientes() {
        const supabase = this.supabaseConfig.getClient();
        const { data, error } = await supabase
            .from('clientes')
            .select('id, nombre, rut, direccion, contacto_nombre, contacto_telefono, contacto_email, activo, created_at')
            .order('created_at', { ascending: false });
        if (error) {
            throw new common_1.BadRequestException(`Error al obtener clientes: ${error.message}`);
        }
        return data || [];
    }
    async getCliente(id) {
        if (!id) {
            throw new common_1.BadRequestException('id es requerido');
        }
        const supabase = this.supabaseConfig.getClient();
        const { data, error } = await supabase
            .from('clientes')
            .select('id, nombre, rut, direccion, contacto_nombre, contacto_telefono, contacto_email, activo, created_at')
            .eq('id', id)
            .single();
        if (error || !data) {
            throw new common_1.NotFoundException(`Cliente no encontrado: ${error?.message ?? id}`);
        }
        return data;
    }
};
exports.ClientesService = ClientesService;
exports.ClientesService = ClientesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof supabase_config_1.SupabaseConfigService !== "undefined" && supabase_config_1.SupabaseConfigService) === "function" ? _a : Object])
], ClientesService);


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
     *
     * Body:
     *   email          (req)  destinatario
     *   clienteId      (req)  fallback legacy si no se entrega rutaId
     *   nombreCliente  (req)  para saludo + asunto
     *   rutaId         (opt)  RECOMENDADO. Hace que el QR codifique
     *                          {ruta_id, codigo_otp} para que coincida
     *                          con lo que escanea el scanner mobile.
     *   codigoOtp      (opt)  Si no viene, el backend lo resuelve
     *                          desde la tabla `entregas`.
     */
    async enviarQR(body) {
        return await this.emailService.enviarQR(body.email, body.clienteId, body.nombreCliente, body.rutaId, body.codigoOtp);
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
const supabase_config_1 = __webpack_require__(/*! ../../config/supabase.config */ "./src/config/supabase.config.ts");
let EmailModule = class EmailModule {
};
exports.EmailModule = EmailModule;
exports.EmailModule = EmailModule = __decorate([
    (0, common_1.Module)({
        providers: [email_service_1.EmailService, resend_config_1.ResendConfigService, supabase_config_1.SupabaseConfigService],
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
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EmailService = void 0;
const common_1 = __webpack_require__(/*! @nestjs/common */ "@nestjs/common");
const resend_config_1 = __webpack_require__(/*! ../../config/resend.config */ "./src/config/resend.config.ts");
const supabase_config_1 = __webpack_require__(/*! ../../config/supabase.config */ "./src/config/supabase.config.ts");
let EmailService = class EmailService {
    constructor(resendConfig, supabaseConfig) {
        this.resendConfig = resendConfig;
        this.supabaseConfig = supabaseConfig;
    }
    /**
     * Envía un correo al cliente con el QR de validación de entrega.
     *
     * El QR codifica un JSON con `{ ruta_id, codigo_otp }` para que coincida
     * con el formato que escanea la app móvil. Si el caller no entrega
     * `rutaId`, se mantiene el comportamiento legacy (QR con `clienteId`
     * como texto plano), pero ese caso ya no debería ocurrir desde mobile.
     */
    async enviarQR(email, clienteId, nombreCliente, rutaId, codigoOtp) {
        if (!email?.trim()) {
            throw new common_1.BadRequestException('email es requerido');
        }
        if (!clienteId?.trim()) {
            throw new common_1.BadRequestException('clienteId es requerido');
        }
        if (!nombreCliente?.trim()) {
            throw new common_1.BadRequestException('nombreCliente es requerido');
        }
        let qrPayload;
        const rutaIdLimpio = rutaId?.trim();
        if (rutaIdLimpio) {
            // Si no recibimos OTP explícito, intentamos resolverlo desde la BD
            // para que el QR ya lo lleve. Si no existe, lo dejamos en null.
            let codigoOtpResuelto = codigoOtp?.trim() || null;
            if (!codigoOtpResuelto) {
                codigoOtpResuelto = await this.buscarCodigoOtp(rutaIdLimpio);
            }
            qrPayload = JSON.stringify({
                ruta_id: rutaIdLimpio,
                codigo_otp: codigoOtpResuelto,
            });
        }
        else {
            // Compat legacy: QR con clienteId como texto plano. El scanner mobile
            // lo intentará parsear como UUID y comparará contra rutaId actual,
            // por lo que en la práctica fallará con "QR no corresponde".
            qrPayload = clienteId.trim();
        }
        // TEMP: diagnóstico de "QR no corresponde". Eliminar luego de validar.
        console.log('QR EMAIL PAYLOAD:', qrPayload);
        const nombreSeguro = this.escapeHtml(nombreCliente.trim());
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrPayload)}`;
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
    /**
     * Busca el `codigo_otp` más reciente vinculado a la ruta. Si no existe
     * registro de entrega o la columna está vacía, devuelve null.
     */
    async buscarCodigoOtp(rutaId) {
        try {
            const supabase = this.supabaseConfig.getClient();
            const { data } = await supabase
                .from('entregas')
                .select('codigo_otp, created_at')
                .eq('ruta_id', rutaId)
                .order('created_at', { ascending: false })
                .limit(1);
            const otp = data?.[0]?.codigo_otp;
            if (typeof otp === 'string' && otp.trim()) {
                return otp.trim();
            }
            return null;
        }
        catch (err) {
            console.warn('No se pudo resolver codigo_otp para ruta', rutaId, err);
            return null;
        }
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
    __metadata("design:paramtypes", [typeof (_a = typeof resend_config_1.ResendConfigService !== "undefined" && resend_config_1.ResendConfigService) === "function" ? _a : Object, typeof (_b = typeof supabase_config_1.SupabaseConfigService !== "undefined" && supabase_config_1.SupabaseConfigService) === "function" ? _b : Object])
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
const uuid_1 = __webpack_require__(/*! uuid */ "uuid");
let EntregasService = class EntregasService {
    constructor(supabaseConfig, resendConfig) {
        this.supabaseConfig = supabaseConfig;
        this.resendConfig = resendConfig;
    }
    /**
     * Cierra una entrega: genera PDF, envía email y marca como validada.
     *
     * Diseñado para que NUNCA un fallo opcional (firma faltante, foto
     * corrupta, email caído, columna `estado` rara) tire 500. Solo se
     * propaga error si la ruta no existe o si la subida del PDF falla
     * sin alternativas.
     */
    async closeDelivery(rutaId, clienteEmail) {
        console.log('CLOSE DELIVERY START -> rutaId:', rutaId, 'clienteEmail:', clienteEmail);
        if (!rutaId) {
            throw new common_1.BadRequestException('rutaId es requerido');
        }
        const supabase = this.supabaseConfig.getClient();
        // ── 1) Cargar ruta ───────────────────────────────────────────
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
            console.warn('CLOSE DELIVERY -> ruta no encontrada:', rutaError);
            throw new common_1.NotFoundException(`Ruta no encontrada: ${rutaError?.message ?? 'sin detalle'}`);
        }
        console.log('CLOSE DELIVERY -> ruta cargada OK:', ruta.id);
        const cliente = Array.isArray(ruta.clientes)
            ? ruta.clientes[0]
            : ruta.clientes;
        try {
            // ── 2) Firma del receptor (esperar firma_url tras POST /signature)
            console.log('PDF STEP -> cargando firma desde entregas');
            let firmaBuffer = null;
            let firmaUrlUsada = null;
            try {
                let intentos = 0;
                while (intentos < 5) {
                    const { data: entregaRow } = await supabase
                        .from('entregas')
                        .select('*')
                        .eq('ruta_id', rutaId)
                        .maybeSingle();
                    const urlCandidate = entregaRow?.firma_url?.trim();
                    console.log(`FIRMA URL EN BD: ${!!urlCandidate}`);
                    if (urlCandidate) {
                        firmaUrlUsada = urlCandidate;
                        break;
                    }
                    console.log(`Esperando firma... intento ${intentos + 1}`);
                    await new Promise((r) => setTimeout(r, 500));
                    intentos++;
                }
                if (!firmaUrlUsada) {
                    console.warn('No se encontró firma_url tras reintentos');
                }
                else {
                    firmaBuffer = await this.downloadFirmaBuffer(supabase, firmaUrlUsada);
                    console.log('PDF -> usando firma:', firmaUrlUsada.slice(0, 96), firmaUrlUsada.length > 96 ? '…' : '');
                    console.log('PDF generateDeliveryPDF precarga -> firmaBuffer bytes:', firmaBuffer?.length ?? 0);
                }
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                console.warn('PDF STEP ERROR -> obteniendo firma (continuamos sin firma):', msg);
            }
            // ── 3) Generar PDF (sin evidencias: el PDF del correo solo
            //     incluye comprobante formal; las fotos se ven en el
            //     Historial web vía GET /api/rutas/:id/evidencias). ────
            console.log('PDF STEP -> generando PDF');
            let pdfBuffer;
            try {
                pdfBuffer = await this.generateDeliveryPDF({
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
                console.log('PDF STEP -> PDF generado, bytes:', pdfBuffer?.length ?? 0);
            }
            catch (e) {
                console.error('PDF STEP ERROR -> generateDeliveryPDF falló:', e?.message, e?.stack);
                throw new common_1.InternalServerErrorException(`No se pudo generar el comprobante PDF: ${e?.message ?? 'error desconocido'}`);
            }
            // ── 5) Subir PDF a Storage con retry (única operación que SÍ
            //     puede abortar el cierre, según la regla 6 del usuario). ──
            console.log('PDF STEP -> subiendo PDF');
            const pdfFilename = `${Date.now()}-${(0, uuid_1.v4)()}.pdf`;
            const pdfPath = `comprobantes/${rutaId}/${pdfFilename}`;
            const uploadOk = await this.subirPDFConRetry(supabase, pdfPath, pdfBuffer);
            if (!uploadOk.success) {
                console.error('PDF STEP ERROR -> upload definitivo (sin más retries):', uploadOk.error);
                throw new common_1.InternalServerErrorException(`Error al subir PDF: ${uploadOk.error || 'fallo de red al guardar comprobante'}`);
            }
            console.log('PDF STEP -> PDF subido a:', pdfPath);
            const { data: publicUrlData } = supabase.storage
                .from('entregas')
                .getPublicUrl(pdfPath);
            // ── 6) Enviar email (best effort: no rompe el cierre) ────
            const emailDestino = clienteEmail || cliente?.contacto_email || null;
            let emailEnviadoOk = false;
            if (emailDestino) {
                try {
                    const resultadoEmail = await this.sendDeliveryEmail(emailDestino, cliente?.nombre || 'Cliente', pdfBuffer, rutaId);
                    emailEnviadoOk = resultadoEmail.ok;
                    if (resultadoEmail.ok) {
                        console.log('CLOSE DELIVERY -> email enviado a:', emailDestino, 'id:', resultadoEmail.id);
                    }
                    else {
                        console.warn('CLOSE DELIVERY -> email no enviado:', resultadoEmail.errorMsg);
                    }
                }
                catch (e) {
                    console.warn('CLOSE DELIVERY -> excepción enviando email (continuamos):', e?.message);
                }
            }
            else {
                console.warn('CLOSE DELIVERY -> sin email destino, se omite envío de correo');
            }
            // ── 7) Marcar entregas como validadas (tolerante al enum) ──
            try {
                // Algunos ambientes tienen el enum `estado_entrega` con valor
                // ENTREGADA, otros no lo aceptan. Si el primer intento falla
                // por enum/columna, reintentamos sin la columna `estado`.
                const updatePayload = {
                    validado: true,
                    fecha_entrega_real: new Date().toISOString(),
                    estado: 'ENTREGADA',
                };
                const { error: updateError } = await supabase
                    .from('entregas')
                    .update(updatePayload)
                    .eq('ruta_id', rutaId);
                if (updateError) {
                    console.warn('CLOSE DELIVERY -> update entregas con estado falló, reintentando sin estado:', updateError.message);
                    delete updatePayload.estado;
                    const { error: retryError } = await supabase
                        .from('entregas')
                        .update(updatePayload)
                        .eq('ruta_id', rutaId);
                    if (retryError) {
                        console.warn('CLOSE DELIVERY -> retry update entregas también falló:', retryError.message);
                    }
                }
                console.log('CLOSE DELIVERY -> entregas marcadas validado=true');
            }
            catch (e) {
                console.warn('CLOSE DELIVERY -> excepción marcando entregas validadas:', e?.message);
            }
            // ── 8) Pasar la ruta a ENTREGADO (enum estado_ruta) ──────
            try {
                const { error: estadoRutaError } = await supabase
                    .from('rutas')
                    .update({ estado: 'ENTREGADO', fecha_fin: new Date().toISOString() })
                    .eq('id', rutaId);
                if (estadoRutaError) {
                    console.warn('CLOSE DELIVERY -> error actualizando rutas.estado a ENTREGADO:', estadoRutaError.message);
                }
                else {
                    console.log('CLOSE DELIVERY -> rutas.estado=ENTREGADO OK');
                }
                try {
                    await supabase.from('historial_estados').insert([
                        {
                            ruta_id: rutaId,
                            estado: 'ENTREGADO',
                            created_at: new Date().toISOString(),
                        },
                    ]);
                    console.log('CLOSE DELIVERY -> historial_estados ENTREGADO registrado');
                }
                catch (histErr) {
                    console.warn('CLOSE DELIVERY -> historial_estados insert omitido:', histErr?.message);
                }
            }
            catch (e) {
                console.warn('CLOSE DELIVERY -> excepción actualizando rutas.estado:', e?.message);
            }
            console.log('CLOSE DELIVERY END -> OK rutaId:', rutaId);
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
            // Log COMPLETO con todo lo que pueda venir desde Supabase / pdfkit / Resend.
            console.error('ERROR CLOSE DELIVERY FULL:', {
                message: error?.message,
                stack: error?.stack,
                response: error?.response,
                code: error?.code,
                details: error?.details,
                hint: error?.hint,
                name: error?.name,
            });
            // Mantenemos el throw para que mobile sepa que algo falló, pero
            // con mensaje útil. NestJS lo serializa como
            // {statusCode, message, error} y el mobile debe leer `message`.
            throw new common_1.InternalServerErrorException(`Error cerrando entrega: ${error?.message ?? 'error desconocido'}`);
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
     * Formatea una fecha ISO al formato `dd-mm-yyyy, HH:mm` (hora local Chile).
     * Si la fecha es inválida o vacía, devuelve "No registrada".
     */
    formatearFecha(iso) {
        if (!iso)
            return 'No registrada';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime()))
            return 'No registrada';
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${dd}-${mm}-${yyyy}, ${hh}:${mins}`;
    }
    /**
     * Descarga imagen de firma: primero fetch(URL pública); fallback storage en fotos_trazabilidad.
     */
    async downloadFirmaBuffer(supabase, firmaUrl) {
        const trimmed = firmaUrl.trim();
        if (!trimmed)
            return null;
        try {
            const response = await fetch(trimmed);
            if (response.ok) {
                const buf = Buffer.from(await response.arrayBuffer());
                if (buf.length > 0) {
                    console.log('downloadFirmaBuffer -> fetch OK, bytes:', buf.length);
                    return buf;
                }
            }
            else {
                console.warn('downloadFirmaBuffer -> fetch status:', response.status, trimmed.slice(0, 120));
            }
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn('downloadFirmaBuffer -> fetch error:', msg);
        }
        const markerPublic = '/storage/v1/object/public/fotos_trazabilidad/';
        if (trimmed.includes(markerPublic)) {
            const rest = trimmed.split(markerPublic)[1]?.split('?')[0];
            if (rest) {
                try {
                    const pathDecoded = decodeURIComponent(rest);
                    const { data: firmaBlob, error: downloadError } = await supabase.storage
                        .from('fotos_trazabilidad')
                        .download(pathDecoded);
                    if (!downloadError && firmaBlob) {
                        const buf = Buffer.from(await firmaBlob.arrayBuffer());
                        console.log('downloadFirmaBuffer -> storage.download OK, bytes:', buf.length);
                        return buf;
                    }
                    console.warn('downloadFirmaBuffer -> storage:', downloadError?.message);
                }
                catch (e) {
                    const msg = e instanceof Error ? e.message : String(e);
                    console.warn('downloadFirmaBuffer -> storage exception:', msg);
                }
            }
        }
        console.warn('downloadFirmaBuffer -> sin buffer; URL parcial:', trimmed.slice(0, 140));
        return null;
    }
    /**
     * Sube un PDF al bucket `entregas` con reintentos. El cliente Supabase
     * usa `fetch` por debajo y cualquier blip de red (DNS, IPv6, TLS,
     * timeout) lo reporta como `"fetch failed"`. Reintentamos con backoff
     * exponencial antes de dar el error al usuario.
     */
    async subirPDFConRetry(supabase, pdfPath, pdfBuffer, maxIntentos = 3) {
        let ultimoError = '';
        for (let intento = 1; intento <= maxIntentos; intento++) {
            try {
                const { error } = await supabase.storage
                    .from('entregas')
                    .upload(pdfPath, pdfBuffer, {
                    contentType: 'application/pdf',
                    upsert: true,
                    cacheControl: '3600',
                });
                if (!error) {
                    if (intento > 1) {
                        console.log(`PDF STEP -> upload OK en intento ${intento}`);
                    }
                    return { success: true };
                }
                ultimoError = error.message || 'error desconocido en upload';
                console.warn(`PDF STEP ERROR -> upload intento ${intento}/${maxIntentos}: ${ultimoError}`);
            }
            catch (e) {
                ultimoError = e?.message || 'excepción de red en upload';
                console.warn(`PDF STEP ERROR -> excepción upload intento ${intento}/${maxIntentos}: ${ultimoError}`);
            }
            if (intento < maxIntentos) {
                const espera = 500 * Math.pow(2, intento - 1);
                await new Promise((r) => setTimeout(r, espera));
            }
        }
        return { success: false, error: ultimoError };
    }
    /**
     * Genera el PDF "Comprobante de despacho" con tabla Concepto/Detalle,
     * firma digital del receptor y footer.
     *
     * Las evidencias fotográficas NO se incluyen en este PDF: el cliente
     * solo necesita el comprobante formal por correo. La galería de
     * fotos se ve únicamente en el Historial web (modal "Ver evidencias",
     * endpoint GET /api/rutas/:id/evidencias).
     */
    async generateDeliveryPDF(data) {
        console.log('PDF generateDeliveryPDF -> firmaBuffer bytes:', data.firmaBuffer?.length ?? 0);
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ size: 'A4', margin: 50 });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            const COLOR_TEXTO = '#111827';
            const COLOR_TENUE = '#6B7280';
            const COLOR_LINEA = '#D1D5DB';
            const COLOR_HEADER_FONDO = '#F3F4F6';
            const COLOR_ACENTO = '#1565C0';
            const margenIzq = doc.page.margins.left;
            const margenDer = doc.page.margins.right;
            const anchoUtil = doc.page.width - margenIzq - margenDer;
            // ── 1) ENCABEZADO ────────────────────────────────────────────
            doc
                .fillColor(COLOR_ACENTO)
                .font('Helvetica-Bold')
                .fontSize(22)
                .text('COMPROBANTE DE DESPACHO', { align: 'center' });
            doc
                .fillColor(COLOR_TENUE)
                .font('Helvetica-Oblique')
                .fontSize(10)
                .text(`Generado el ${this.formatearFecha(new Date().toISOString())}`, {
                align: 'center',
            });
            doc.moveDown(1.2);
            // Línea separadora
            const yLinea1 = doc.y;
            doc
                .strokeColor(COLOR_LINEA)
                .lineWidth(1)
                .moveTo(margenIzq, yLinea1)
                .lineTo(margenIzq + anchoUtil, yLinea1)
                .stroke();
            doc.moveDown(0.8);
            // ── 2) TABLA Concepto / Detalle ─────────────────────────────
            const filas = [
                ['ID de ruta', data.rutaId],
                ['Cliente', data.cliente?.nombre || 'N/A'],
            ];
            if (data.cliente?.contacto_email) {
                filas.push(['Correo de contacto', data.cliente.contacto_email]);
            }
            filas.push(['Origen', data.origen || 'N/A'], ['Destino', data.destino || 'N/A'], ['Conductor', data.conductor?.rut || 'N/A'], ['Vehículo', data.camion?.patente || 'N/A'], ['Fecha de inicio', this.formatearFecha(data.fechaInicio)], ['Fecha de entrega', this.formatearFecha(data.fechaFin)], ['Estado validación', 'ENTREGADO – VALIDADO']);
            const colConceptoAncho = anchoUtil * 0.32;
            const colDetalleAncho = anchoUtil - colConceptoAncho;
            const padCelda = 8;
            // Header de la tabla
            doc.fillColor(COLOR_TEXTO).font('Helvetica-Bold').fontSize(11);
            const yHeader = doc.y;
            const altoHeader = 22;
            doc
                .fillColor(COLOR_HEADER_FONDO)
                .rect(margenIzq, yHeader, anchoUtil, altoHeader)
                .fill();
            doc
                .fillColor(COLOR_TEXTO)
                .text('Concepto', margenIzq + padCelda, yHeader + 6, {
                width: colConceptoAncho - padCelda,
                align: 'left',
            });
            doc.text('Detalle', margenIzq + colConceptoAncho + padCelda, yHeader + 6, { width: colDetalleAncho - padCelda * 2, align: 'left' });
            doc.y = yHeader + altoHeader;
            // Borde top tabla
            doc
                .strokeColor(COLOR_LINEA)
                .lineWidth(0.5)
                .rect(margenIzq, yHeader, anchoUtil, altoHeader)
                .stroke();
            // Filas
            doc.font('Helvetica').fontSize(10).fillColor(COLOR_TEXTO);
            for (const [concepto, detalle] of filas) {
                const yFila = doc.y;
                // Calcular alto requerido por la celda de detalle (texto puede ser largo)
                const altoConcepto = doc.heightOfString(concepto, {
                    width: colConceptoAncho - padCelda * 2,
                });
                const altoDetalle = doc.heightOfString(detalle, {
                    width: colDetalleAncho - padCelda * 2,
                });
                const altoFila = Math.max(altoConcepto, altoDetalle) + padCelda * 2;
                // Si no cabe, salto de página y repinto la cabecera básica
                if (yFila + altoFila > doc.page.height - doc.page.margins.bottom) {
                    doc.addPage();
                }
                const yActual = doc.y;
                doc
                    .strokeColor(COLOR_LINEA)
                    .lineWidth(0.5)
                    .rect(margenIzq, yActual, anchoUtil, altoFila)
                    .stroke();
                // Línea divisoria entre columnas
                doc
                    .moveTo(margenIzq + colConceptoAncho, yActual)
                    .lineTo(margenIzq + colConceptoAncho, yActual + altoFila)
                    .stroke();
                doc
                    .font('Helvetica-Bold')
                    .fillColor(COLOR_TEXTO)
                    .text(concepto, margenIzq + padCelda, yActual + padCelda, {
                    width: colConceptoAncho - padCelda * 2,
                });
                doc
                    .font('Helvetica')
                    .fillColor(COLOR_TEXTO)
                    .text(detalle, margenIzq + colConceptoAncho + padCelda, yActual + padCelda, { width: colDetalleAncho - padCelda * 2 });
                doc.y = yActual + altoFila;
            }
            doc.moveDown(1.2);
            // ── 3) FIRMA DIGITAL ────────────────────────────────────────
            if (doc.y > doc.page.height - doc.page.margins.bottom - 180) {
                doc.addPage();
            }
            doc
                .font('Helvetica-Bold')
                .fontSize(13)
                .fillColor(COLOR_TEXTO)
                .text('Firma digital del receptor', { align: 'center' });
            doc.moveDown(0.6);
            const firmaAncho = 220;
            const firmaAlto = 110;
            const xFirma = margenIzq + (anchoUtil - firmaAncho) / 2;
            if (data.firmaBuffer && data.firmaBuffer.length > 0) {
                try {
                    doc.image(data.firmaBuffer, xFirma, doc.y, {
                        fit: [firmaAncho, firmaAlto],
                        align: 'center',
                    });
                    doc.y += firmaAlto + 6;
                    // Línea base bajo la firma
                    doc
                        .strokeColor(COLOR_LINEA)
                        .lineWidth(0.5)
                        .moveTo(xFirma, doc.y)
                        .lineTo(xFirma + firmaAncho, doc.y)
                        .stroke();
                }
                catch (err) {
                    console.warn(`No se pudo insertar firma en PDF: ${err?.message}`);
                    doc
                        .font('Helvetica-Oblique')
                        .fontSize(10)
                        .fillColor(COLOR_TENUE)
                        .text('Sin firma disponible', { align: 'center' });
                }
            }
            else {
                doc
                    .font('Helvetica-Oblique')
                    .fontSize(10)
                    .fillColor(COLOR_TENUE)
                    .text('Sin firma disponible', { align: 'center' });
            }
            doc.moveDown(1.5);
            // ── 4) FOOTER ───────────────────────────────────────────────
            doc.moveDown(1.2);
            const yFooter = doc.page.height - doc.page.margins.bottom - 20;
            doc
                .font('Helvetica-Oblique')
                .fontSize(8)
                .fillColor(COLOR_TENUE)
                .text(`LogiTrack — Documento generado el ${this.formatearFecha(new Date().toISOString())}`, margenIzq, yFooter, { align: 'center', width: anchoUtil });
            doc.end();
        });
    }
    /**
     * Envía email de comprobante de entrega al cliente.
     *
     * Devuelve `{ ok, id?, errorMsg? }`:
     *  - `ok=true` solo si Resend confirmó con un id de correo.
     *  - `ok=false` si Resend devolvió `error` en el response (falla
     *    silenciosa típica: dominio no verificado, "to" inválido,
     *    cuenta sin saldo, etc.) o tiró excepción.
     */
    async sendDeliveryEmail(emailCliente, nombreCliente, pdfBuffer, rutaId) {
        const resend = this.resendConfig.getClient();
        const fromUsado = process.env.RESEND_FROM_EMAIL ||
            'Sistema LogiTrack <onboarding@resend.dev>';
        console.log('CLOSE DELIVERY -> sendDeliveryEmail FROM:', fromUsado, 'TO:', emailCliente);
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
            const base64Pdf = pdfBuffer.toString('base64');
            const response = await resend.emails.send({
                from: fromUsado,
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
            // TEMP: Resend retorna { data: { id }, error }. Loggeamos completo
            // para diagnosticar por qué el correo no llega aunque "se envíe".
            console.log('RESEND EMAIL RESPONSE:', JSON.stringify(response));
            if (response?.error) {
                const err = response.error;
                console.warn('RESEND EMAIL ERROR:', err);
                return {
                    ok: false,
                    errorMsg: err?.message || err?.name || 'error desconocido de Resend',
                };
            }
            const id = response?.data?.id ?? response?.id ?? null;
            if (!id) {
                console.warn('RESEND EMAIL WARNING: respuesta sin id ni error explícito');
                return { ok: false, errorMsg: 'Resend no confirmó id de envío' };
            }
            return { ok: true, id };
        }
        catch (error) {
            console.warn('RESEND EMAIL EXCEPTION:', error?.message, error?.name, error?.statusCode);
            return {
                ok: false,
                errorMsg: error?.message || 'excepción al enviar correo',
            };
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
/** Valores del enum Postgres `estado_incidencia` (tabla `incidencias.estado`). */
const ESTADO_INCIDENCIA = {
    PENDIENTE: 'pendiente',
    EN_CURSO: 'en curso',
    RESUELTO: 'resuelto',
};
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
            estado: ESTADO_INCIDENCIA.EN_CURSO,
            atendido_por: operatorId,
            fecha_atencion: new Date().toISOString(),
        })
            .eq('id', incidenciaId)
            .select()
            .single();
        if (error) {
            // TEMP: diagnóstico completo (retirar cuando el flujo esté estable)
            console.warn('acknowledgeIncidencia Supabase error (full JSON):', JSON.stringify(error));
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
            estado: ESTADO_INCIDENCIA.RESUELTO,
            fecha_resolucion: new Date().toISOString(),
        })
            .eq('id', incidenciaId)
            .select()
            .single();
        if (error) {
            console.warn('resolveIncidencia Supabase error (full JSON):', JSON.stringify(error));
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
     * GET /api/rutas/:id/evidencias
     * Devuelve PDF de comprobante (si existe) y fotos de trazabilidad
     * de la ruta. Usado por la vista Historial.
     */
    async getEvidencias(rutaId) {
        return await this.rutasService.getEvidencias(rutaId);
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
    (0, common_1.Get)(':id/evidencias'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RutasController.prototype, "getEvidencias", null);
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
        // PASO 4: Actualizar ruta con conductor y camión.
        // El enum real `estado_ruta` usa 'ASIGNADO' (masculino), no 'ASIGNADA'.
        const { data: rutaActualizada, error: updateError } = await supabase
            .from('rutas')
            .update({
            conductor_id: conductorId,
            camion_id: camionId,
            fecha_inicio: new Date().toISOString(),
            estado: 'ASIGNADO',
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
                estado: 'ASIGNADO',
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
                estado: 'ASIGNADO',
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
        // Enum real `estado_ruta` en Supabase.
        const estadosValidos = [
            'PENDIENTE',
            'ASIGNADO',
            'EN_CAMINO_ORIGEN',
            'EN_CARGA',
            'EN_TRANSITO',
            'EN_DESTINO',
            'ENTREGADO',
            'CANCELADO',
        ];
        if (!estadosValidos.includes(nuevoEstado)) {
            throw new common_1.BadRequestException(`Estado inválido. Acepta: ${estadosValidos.join(', ')}`);
        }
        const patch = { estado: nuevoEstado };
        // Solo registrar fecha_fin al cerrar entrega; no borrar fecha_fin al
        // cambiar a otros estados (evita pérdida de auditoría).
        if (nuevoEstado === 'ENTREGADO') {
            patch.fecha_fin = new Date().toISOString();
        }
        const { data: rutaActualizada, error } = await supabase
            .from('rutas')
            .update(patch)
            .eq('id', rutaId)
            .select();
        if (error) {
            throw new common_1.BadRequestException(`Error al actualizar ruta: ${error.message}`);
        }
        // Si el despacho se marca ENTREGADO desde la web sin pasar por closeDelivery,
        // reflejar fecha de entrega en `entregas` cuando exista la fila (best effort).
        if (nuevoEstado === 'ENTREGADO') {
            try {
                await supabase
                    .from('entregas')
                    .update({ fecha_entrega_real: new Date().toISOString() })
                    .eq('ruta_id', rutaId);
            }
            catch {
                /* tabla/claves pueden variar entre ambientes */
            }
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
      created_at,
      cliente_id,
      conductor_id,
      camion_id,
      clientes(id, nombre),
      conductores(id, rut),
      camiones(id, patente)
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
    /**
     * Devuelve las evidencias de una ruta para el modal Historial web:
     *  - `pdfs`: bucket `entregas/comprobantes/{rutaId}/`
     *  - `fotos`: unión en orden — tabla `fotos` por `ruta_id`, más
     *    `traceability_events` por `ruta_id`; dedupe por URL.
     *    Fallback temporal legacy solo si sigue sin fotos y existe ventana
     *    `fecha_inicio`/`fecha_fin` (marcado `fuente: fallback_temporal`).
     *  - `firmaUrl`: `entregas.firma_url` o prefijo `{rutaId}-` en Storage.
     */
    async getEvidencias(rutaId) {
        if (!rutaId) {
            throw new common_1.BadRequestException('rutaId es requerido');
        }
        const supabase = this.supabaseConfig.getClient();
        const { data: ruta, error: rutaError } = await supabase
            .from('rutas')
            .select('id, fecha_inicio, fecha_fin')
            .eq('id', rutaId)
            .single();
        if (rutaError || !ruta) {
            throw new common_1.NotFoundException('Ruta no encontrada');
        }
        // ── 1) PDFs en bucket `entregas`, carpeta `comprobantes/{rutaId}/...`
        const pdfFiles = await this.supabaseConfig.listFiles('entregas', `comprobantes/${rutaId}`);
        const pdfs = pdfFiles
            .filter((f) => f.name.toLowerCase().endsWith('.pdf'))
            .map((f) => ({
            nombre: f.name,
            url: this.supabaseConfig.getPublicUrl('entregas', `comprobantes/${rutaId}/${f.name}`),
        }))
            .filter((p) => !!p.url);
        const fotos = [];
        const urlsVistas = new Set();
        const pushFoto = (id, etapa, url, timestamp, fuente) => {
            if (!url || typeof url !== 'string')
                return;
            const u = url.trim();
            if (!u || urlsVistas.has(u))
                return;
            urlsVistas.add(u);
            fotos.push({
                id,
                etapa,
                url: u,
                timestamp,
                fuente,
            });
        };
        // 2a) Tabla `fotos` (prioridad por vínculo directo ruta_id)
        const { data: fotosRow } = await supabase
            .from('fotos')
            .select('id, etapa, url, created_at')
            .eq('ruta_id', rutaId)
            .order('created_at', { ascending: true });
        for (const f of fotosRow || []) {
            pushFoto(String(f.id), f.etapa ?? null, f.url, f.created_at ?? null, 'fotos_tabla');
        }
        // 2b) traceability_events por ruta_id (si existe la columna)
        const traceRuta = await supabase
            .from('traceability_events')
            .select('id, etapa, foto_uri, timestamp_evento')
            .eq('ruta_id', rutaId)
            .order('timestamp_evento', { ascending: true });
        const errTrace = traceRuta.error &&
            ['42703', 'PGRST204'].includes(traceRuta.error.code || '');
        if (!traceRuta.error && traceRuta.data) {
            for (const ev of traceRuta.data) {
                if (!ev?.foto_uri)
                    continue;
                const url = this.supabaseConfig.getPublicUrl('fotos_trazabilidad', ev.foto_uri);
                pushFoto(String(ev.id ?? `ev-${ev.foto_uri}`), ev.etapa ?? null, url, ev.timestamp_evento ?? null, 'traceability_ruta');
            }
        }
        else if (errTrace) {
            console.warn('EVIDENCIAS -> traceability_events.ruta_id no disponible en BD (columna ausente); omitiendo vínculo por ruta.');
        }
        // 2c) Fallback temporal legacy (solo si sigue sin fotos desde fuentes directas).
        //    Puede acotarse mejor cuando todas las filas tengan ruta_id poblado.
        if (fotos.length === 0 && ruta.fecha_inicio) {
            const desde = ruta.fecha_inicio;
            const hasta = ruta.fecha_fin || new Date().toISOString();
            const fallback = await supabase
                .from('traceability_events')
                .select('id, etapa, foto_uri, timestamp_evento')
                .gte('timestamp_evento', desde)
                .lte('timestamp_evento', hasta)
                .order('timestamp_evento', { ascending: true });
            console.warn('EVIDENCIAS -> fallback temporal legacy (sin fotos por tabla fotos ni traceability_events.ruta_id)');
            for (const ev of fallback.data || []) {
                if (!ev?.foto_uri)
                    continue;
                const url = this.supabaseConfig.getPublicUrl('fotos_trazabilidad', ev.foto_uri);
                pushFoto(String(ev.id ?? `legacy-${ev.foto_uri}`), ev.etapa ?? null, url, ev.timestamp_evento ?? null, 'fallback_temporal');
            }
        }
        // ── 3) Firma: primero tabla `entregas`, fallback storage
        let firmaUrl = null;
        const { data: entregasRows } = await supabase
            .from('entregas')
            .select('firma_url, fecha_entrega_real, created_at')
            .eq('ruta_id', rutaId)
            .order('created_at', { ascending: false });
        for (const e of entregasRows || []) {
            const candidate = (e?.firma_url || '').toString().trim();
            if (candidate && candidate.toLowerCase() !== 'null') {
                firmaUrl = candidate;
                break;
            }
        }
        if (!firmaUrl) {
            const firmaFiles = await this.supabaseConfig.listFiles('fotos_trazabilidad', 'firmas');
            const match = firmaFiles.find((f) => f.name.startsWith(`${rutaId}-`));
            if (match) {
                firmaUrl = this.supabaseConfig.getPublicUrl('fotos_trazabilidad', `firmas/${match.name}`);
            }
        }
        return {
            rutaId,
            pdfs,
            fotos,
            firmaUrl,
        };
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
        const { id, etapa, foto_uri, latitud, longitud, timestamp_evento, ruta_id: rutaSnake, rutaId: rutaCamel, } = body;
        const ruta_id = typeof rutaSnake === 'string' && rutaSnake.trim()
            ? rutaSnake.trim()
            : typeof rutaCamel === 'string' && rutaCamel.trim()
                ? rutaCamel.trim()
                : null;
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
            ruta_id,
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
// Códigos de error de PostgREST cuando una columna no existe en la tabla.
// Cubren versiones 42703 (postgres) y PGRST204 (postgrest) por seguridad.
const COLUMN_NOT_FOUND_CODES = new Set(['42703', 'PGRST204']);
let TrazabilidadService = class TrazabilidadService {
    constructor(supabaseConfig) {
        this.supabaseConfig = supabaseConfig;
        // Cache para no reintentar incluir `ruta_id` después de saber que la
        // columna no existe en la BD. Se reinicia al reiniciar el backend.
        this.rutaIdColumnAvailable = true;
    }
    async createEvent(data) {
        const supabase = this.supabaseConfig.getClient();
        const baseRow = {
            id: data.id,
            etapa: data.etapa,
            foto_uri: data.foto_uri,
            latitud: data.latitud,
            longitud: data.longitud,
            timestamp_evento: data.timestamp_evento,
        };
        // Solo intentamos persistir ruta_id si vino en el payload Y todavía
        // no descubrimos que la columna no existe en esta instancia.
        if (data.ruta_id && this.rutaIdColumnAvailable) {
            baseRow.ruta_id = data.ruta_id;
        }
        let { data: row, error } = await supabase
            .from('traceability_events')
            .upsert(baseRow, { onConflict: 'id' })
            .select()
            .single();
        // Si la columna ruta_id aún no se migró, recordamos y reintentamos
        // sin el campo. Así el servicio sigue trabajando hasta que la
        // migración SQL se aplique.
        if (error &&
            'ruta_id' in baseRow &&
            COLUMN_NOT_FOUND_CODES.has(error.code || '')) {
            console.warn('traceability_events.ruta_id no existe todavía: descarto el campo y reintento. ' +
                'Aplica la migración SQL para habilitar el vínculo directo.');
            this.rutaIdColumnAvailable = false;
            delete baseRow.ruta_id;
            const retry = await supabase
                .from('traceability_events')
                .upsert(baseRow, { onConflict: 'id' })
                .select()
                .single();
            row = retry.data;
            error = retry.error;
        }
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

/***/ "express":
/*!**************************!*\
  !*** external "express" ***!
  \**************************/
/***/ ((module) => {

module.exports = require("express");

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

/***/ }),

/***/ "uuid":
/*!***********************!*\
  !*** external "uuid" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("uuid");

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