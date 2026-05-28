import { Controller, Post, Body, Inject, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {
    console.log('AuthController: constructor called', !!this.authService);
  }

  @Post('login')
  async login(@Body() req: any) {
    console.log('AuthController: Incoming request body:', JSON.stringify(req));
    const user = await this.authService.validateUser(req.email, req.password);
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() req: any) {
    console.log('AuthController: Incoming register request:', JSON.stringify(req));
    try {
      const email = req?.email;
      const password = req?.password;
      const role = req?.role || 'User';
      return await this.authService.register(email, password, role);
    } catch (error: any) {
      throw new UnauthorizedException(error.message || 'Error al registrar el usuario');
    }
  }

  @Post('forgot-password')
  async forgotPassword(@Body() req: any) {
    const email = req?.email || req;
    console.log('AuthController: Received email for recovery:', email);
    const result = await this.authService.forgotPassword(email);
    console.log('AuthController: Forgot password result:', result);
    return result;
  }
}
