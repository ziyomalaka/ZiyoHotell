import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService, REFRESH_COOKIE } from './auth.service';
import { Public } from '../common/decorators';

class LoginDto {
  @IsString()
  login!: string;
  @IsString()
  @MinLength(1)
  password!: string;
}

class ChangePasswordDto {
  @IsString()
  currentPassword!: string;
  @IsString()
  @MinLength(5)
  newPassword!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(200)
  @Post('login')
  login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(body.login, body.password, res);
  }

  @Public()
  @HttpCode(200)
  @Post('refresh')
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req.cookies?.[REFRESH_COOKIE] as string) || (req.body?.refreshToken as string);
    return this.auth.refresh(token, res);
  }

  @Public()
  @HttpCode(200)
  @Post('logout')
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(req.cookies?.[REFRESH_COOKIE], res, (req as Request & { user?: { id: string } }).user?.id);
  }

  @Get('me')
  me(@Req() req: Request & { user: { id: string } }) {
    return this.auth.me(req.user.id);
  }

  @Post('change-password')
  changePassword(@Req() req: Request & { user: { id: string } }, @Body() body: ChangePasswordDto) {
    return this.auth.changePassword(req.user.id, body.currentPassword, body.newPassword);
  }
}
